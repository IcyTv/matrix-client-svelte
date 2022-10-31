#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{
    io::{Read, Write},
    net::TcpStream,
    sync::Arc,
};

use anyhow::{anyhow, bail};
use async_mutex::Mutex;
use lazy_static::lazy_static;
use matrix_sdk::{
    config::SyncSettings,
    room::MessagesOptions,
    ruma::{RoomId, UserId},
    Client, Session,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{Manager, Runtime};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct JoinedRoom {
    pub room_id: String,
    pub name: String,
    pub is_space: bool,
    pub avatar: Option<String>,
    pub avatar_media_url: Option<String>,
    pub topic: Option<String>,
}

// FIXME this seems like a bad way to handle this...
const MEDIA_PREVIEW_URL: &str = "https://matrix-client.matrix.org/_matrix/media/r0/thumbnail/";

impl From<&matrix_sdk::room::Joined> for JoinedRoom {
    fn from(room: &matrix_sdk::room::Joined) -> Self {
        Self {
            room_id: room.room_id().to_string(),
            avatar: room.avatar_url().map(|u| u.to_string()),
            name: room.name().unwrap_or_else(|| room.room_id().to_string()),
            is_space: room.is_space(),
            avatar_media_url: room
                .avatar_url()
                .and_then(|u| {
                    Some((
                        u.media_id().ok()?.to_string(),
                        u.server_name().ok()?.to_string(),
                    ))
                })
                .map(|(media_id, server_name)| {
                    format!("{}{}/{}", MEDIA_PREVIEW_URL, server_name, media_id)
                }),
            topic: room.topic(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UserProfile {
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub avatar_media_url: Option<String>,
    pub user_id: String,
}

impl UserProfile {
    pub async fn from_client(client: &matrix_sdk::Client) -> Result<Self, String> {
        let user_id = client.user_id().ok_or("No user id")?;

        let req = matrix_sdk::ruma::api::client::profile::get_profile::v3::Request::new(user_id);
        let response = client.send(req, None).await.map_err(|e| e.to_string())?;

        Ok(Self {
            user_id: user_id.to_string(),
            display_name: response.displayname.unwrap_or_default(),
            avatar_url: response.avatar_url.clone().map(|u| u.to_string()),
            avatar_media_url: response
                .avatar_url
                .and_then(|u| {
                    Some((
                        u.media_id().ok()?.to_string(),
                        u.server_name().ok()?.to_string(),
                    ))
                })
                .map(|(media_id, server_name)| {
                    format!("{}{}/{}", MEDIA_PREVIEW_URL, server_name, media_id)
                }),
        })
    }

    pub async fn from_user_id(
        client: &matrix_sdk::Client,
        user_id: &UserId,
    ) -> Result<Self, String> {
        let req = matrix_sdk::ruma::api::client::profile::get_profile::v3::Request::new(user_id);
        let response = client.send(req, None).await.map_err(|e| e.to_string())?;

        Ok(Self {
            user_id: user_id.to_string(),
            display_name: response.displayname.unwrap_or_default(),
            avatar_url: response.avatar_url.clone().map(|u| u.to_string()),
            avatar_media_url: response
                .avatar_url
                .and_then(|u| {
                    Some((
                        u.media_id().ok()?.to_string(),
                        u.server_name().ok()?.to_string(),
                    ))
                })
                .map(|(media_id, server_name)| {
                    format!("{}{}/{}", MEDIA_PREVIEW_URL, server_name, media_id)
                }),
        })
    }
}

lazy_static! {
    // TODO - try and move to a tauri state...
    static ref CLIENT: Arc<Mutex<Option<Client>>> = Arc::new(Mutex::new(None));
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

#[tauri::command]
async fn login(homeserver: &str, username: &str, password: &str) -> Result<(), String> {
    login_impl(homeserver, username, password)
        .await
        .map_err(|e| e.to_string())
}

async fn login_impl(homeserver: &str, username: &str, password: &str) -> anyhow::Result<()> {
    let mut builder = Client::builder().homeserver_url(homeserver);

    let home = dirs::data_dir()
        .ok_or_else(|| anyhow!("No Home dir found!"))?
        .join("matrix-client");
    builder = builder.sled_store(home, None)?;

    let client = builder.build().await?;

    client
        .login_username(username, password)
        .initial_device_display_name("Matrix Client")
        .send()
        .await?;

    println!("Logged in!");

    Ok(())
}

#[derive(Serialize, Deserialize)]
pub enum OauthProvider {
    Github,
    Google,
    Gitlab,
    Facebook,
    Apple,
}

impl OauthProvider {
    fn idp_id(&self) -> String {
        match self {
            Self::Github => "oidc-github".to_string(),
            Self::Google => "oidc-google".to_string(),
            Self::Gitlab => "oidc-gitlab".to_string(),
            Self::Facebook => "oidc-facebook".to_string(),
            Self::Apple => "oidc-apple".to_string(),
        }
    }
}

#[tauri::command]
async fn login_sso<R: Runtime>(
    app: tauri::AppHandle<R>,
    homeserver: &str,
    provider: OauthProvider,
) -> Result<(), String> {
    login_sso_impl(homeserver, &provider)
        .await
        .map_err(|e| e.to_string())?;

    app.emit_all("login", "").unwrap();

    Ok(())
}

async fn login_sso_impl(homeserver: &str, provider: &OauthProvider) -> anyhow::Result<()> {
    let dir = dirs::data_dir().unwrap().join("matrix-client").join("data");
    let config = matrix_sdk::store::make_store_config(dir, None).unwrap();
    let client = Client::builder()
        .handle_refresh_tokens()
        .store_config(config)
        .homeserver_url(homeserver)
        .build()
        .await?;

    let port = portpicker::pick_unused_port().unwrap();

    let login_url = client
        .get_sso_login_url(
            format!("http://localhost:{}", port).as_str(),
            Some(&provider.idp_id()),
        )
        .await?;

    println!("Login URL: {}", login_url);

    // Tries to read the login token from the response.
    fn handle_read(mut stream: &TcpStream) -> Option<String> {
        let mut buf = [0u8; 4096];
        match stream.read(&mut buf) {
            Ok(n) => {
                if n == 4096 {
                    eprintln!("Buffer likely too smal...");
                }
                let req_str = String::from_utf8_lossy(&buf).to_string();
                println!("Request: {}", req_str);

                // In this request string, the token should be in the query string as the parameter loginToken
                // This means the request looks something like:GET /?loginToken=<TOKEN> HTTP/1.1

                let token = req_str
                    .split_whitespace()
                    .nth(1)?
                    .strip_prefix("/?loginToken=")?;

                if token.is_empty() {
                    None
                } else {
                    Some(token.to_string())
                }
            }
            Err(e) => {
                println!("Failed to read from socket: {}", e);
                None
            }
        }
    }

    fn handle_write(mut stream: TcpStream, success: bool) {
        let response = if success {
            r#"HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8

<html>
	<head>
		<title>Logged in!</title>
	</head>
	<body>
		<h1>Logged in!</h1>
		<p>You can close this window now.</p>
	</body>
</html>"#
        } else {
            r#"HTTP/1.1 401 Unauthorized
Content-Type: text/html; charset=UTF-8

<html>
	<head>
		<title>Failed to log in!</title>
	</head>
	<body>
		<h1>Failed to log in!</h1>
		<p>Please go back to the app and try again.</p>
	</body>
</html>"#
        };

        match stream.write_all(response.as_bytes()) {
            Ok(_) => println!("Response sent"),
            Err(e) => println!("Failed to send response: {}", e),
        }
    }

    fn handle_client(stream: TcpStream) -> Option<String> {
        let token = handle_read(&stream);
        handle_write(stream, token.is_some());
        token
    }

    let listener = std::net::TcpListener::bind(format!("127.0.0.1:{}", port)).unwrap();

    println!("Listening on port {}", port);

    open::that(login_url)?;

    #[allow(clippy::never_loop)]
    let mut login_token = String::new();

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                println!("New connection: {}", stream.peer_addr().unwrap());
                let maybe_token = handle_client(stream);
                if let Some(token) = maybe_token {
                    login_token = token;
                    break;
                }
            }
            Err(e) => {
                eprintln!("Error: {}", e);
            }
        }
    }

    if login_token.is_empty() {
        bail!("No login token found!");
    }

    println!("Login token: {}", login_token);

    // TODO we should show an error message in the browser if this fails...

    let response = client
        .login_token(&login_token)
        .send()
        .await
        .map_err(|e| anyhow!("Failed to login: {}", e))?;

    println!("Logged in: {:?}", response);

    client.sync_once(SyncSettings::new()).await?;

    {
        CLIENT.lock().await.replace(client);
    }

    let session = Session::from(response);

    let dir = dirs::data_dir().unwrap().join("matrix-client").join("sled");
    let store = sled::open(dir)?;
    let data = serde_json::to_vec(&session)?;
    println!("Session: {:?}", data);
    store.insert("session", data)?;

    sync_loop();

    Ok(())
}

/// ATTENTION: This command assumes that you have a sso url that contains a redirect link of "REDIRECT"
#[tauri::command]
async fn login_redirect(link: &str) -> Result<String, String> {
    let port = portpicker::pick_unused_port().unwrap();
    let redirect_url = format!("http://localhost:{}", port);

    let sso_url = link.replace("REDIRECT", &redirect_url);

    // TODO factor out to function and remove login_sso...
    // Tries to read the login token from the response.
    fn handle_read(mut stream: &TcpStream) -> Option<String> {
        let mut buf = [0u8; 4096];
        match stream.read(&mut buf) {
            Ok(n) => {
                if n == 4096 {
                    eprintln!("Buffer likely too smal...");
                }
                let req_str = String::from_utf8_lossy(&buf).to_string();
                println!("Request: {}", req_str);

                // In this request string, the token should be in the query string as the parameter loginToken
                // This means the request looks something like:GET /?loginToken=<TOKEN> HTTP/1.1

                let token = req_str
                    .split_whitespace()
                    .nth(1)?
                    .strip_prefix("/?loginToken=")?;

                if token.is_empty() {
                    None
                } else {
                    Some(token.to_string())
                }
            }
            Err(e) => {
                println!("Failed to read from socket: {}", e);
                None
            }
        }
    }

    fn handle_write(mut stream: TcpStream, success: bool) {
        let response = if success {
            r#"HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8

<html>
	<head>
		<title>Logged in!</title>
	</head>
	<body>
		<h1>Logged in!</h1>
		<p>You can close this window now.</p>
	</body>
</html>"#
        } else {
            r#"HTTP/1.1 401 Unauthorized
Content-Type: text/html; charset=UTF-8

<html>
	<head>
		<title>Failed to log in!</title>
	</head>
	<body>
		<h1>Failed to log in!</h1>
		<p>Please go back to the app and try again.</p>
	</body>
</html>"#
        };

        match stream.write_all(response.as_bytes()) {
            Ok(_) => println!("Response sent"),
            Err(e) => println!("Failed to send response: {}", e),
        }
    }

    fn handle_client(stream: TcpStream) -> Option<String> {
        let token = handle_read(&stream);
        handle_write(stream, token.is_some());
        token
    }

    let listener =
        std::net::TcpListener::bind(format!("127.0.0.1:{}", port)).map_err(|e| e.to_string())?;

    println!("Listening on port {}", port);

    open::that(sso_url).map_err(|e| format!("Failed to open browser: {}", e))?;

    let mut login_token = String::new();

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                println!("New connection: {}", stream.peer_addr().unwrap());
                let maybe_token = handle_client(stream);
                if let Some(token) = maybe_token {
                    login_token = token;
                    break;
                }
            }
            Err(e) => {
                eprintln!("Error: {}", e);
            }
        }
    }

    if login_token.is_empty() {
        return Err("No login token found!".to_string());
    }

    println!("Login token: {}", login_token);

    Ok(login_token)
}

#[tauri::command]
async fn is_logged_in() -> bool {
    let client = CLIENT.lock().await;
    client.is_some() && client.as_ref().unwrap().logged_in()
}

#[tauri::command]
async fn rooms() -> Result<Value, String> {
    // let client = unsafe { CLIENT.as_ref().unwrap() };
    let client = CLIENT.lock().await;
    let client = client.as_ref().unwrap();

    let rooms = client.joined_rooms();
    let rooms = rooms.iter().map(JoinedRoom::from).collect::<Vec<_>>();

    // println!("Rooms: {:?}", rooms);

    Ok(serde_json::to_value(rooms).unwrap())
}

#[tauri::command]
async fn get_room_children(room_id: &str) -> Result<Value, String> {
    let client = CLIENT.lock().await;
    let client = client.as_ref().unwrap();

    let room_id = <&RoomId>::try_from(room_id).unwrap();

    let request = matrix_sdk::ruma::api::client::space::get_hierarchy::v1::Request::new(room_id);

    let response = client.send(request, None).await.unwrap();

    let child_rooms = response.rooms;

    Ok(serde_json::to_value(child_rooms).unwrap())
}

#[tauri::command]
async fn logout() -> Result<(), String> {
    // let client = unsafe { CLIENT.as_ref().unwrap() };
    let client = {
        let mut mutex = CLIENT.lock().await;
        mutex.take()
    }
    .unwrap();

    client.logout().await.map_err(|e| e.to_string())?;

    let dir = dirs::data_dir().unwrap().join("matrix-client").join("sled");
    let store = sled::open(dir).map_err(|e| e.to_string())?;
    store.remove("session").map_err(|e| e.to_string())?;

    Ok(())
}

fn sync_loop() {
    eprintln!("TODO: Sync loop");

    // std::thread::spawn(|| {
    //     let runtime = tokio::runtime::Runtime::new().unwrap();

    //     runtime.block_on(async {
    //         let local = tokio::task::LocalSet::new();
    //         local
    //             .run_until(async {
    //                 tokio::task::spawn_local(async move {
    //                     loop {
    //                         let client = CLIENT.lock().await;
    //                         if let Some(client) = client.as_ref() {
    //                             client.sync_once(SyncSettings::new()).await.unwrap();
    //                         }
    //                         drop(client);
    //                         tokio::time::sleep(std::time::Duration::from_secs(5)).await;
    //                     }
    //                 });
    //             })
    //             .await;
    //     });
    // });
}

#[tauri::command]
async fn user_profile() -> Result<Value, String> {
    let client = CLIENT.lock().await;
    let user = UserProfile::from_client(client.as_ref().unwrap()).await?;
    Ok(serde_json::to_value(user).unwrap())
}

#[tauri::command]
async fn user_info(id: &str) -> Result<Value, String> {
    let user_id = <&UserId>::try_from(id).unwrap();

    let client = CLIENT.lock().await;
    let user = UserProfile::from_user_id(client.as_ref().unwrap(), user_id).await?;
    Ok(serde_json::to_value(user).unwrap())
}

#[tauri::command]
async fn get_messages(room_id: &str) -> Result<Value, String> {
    let options = MessagesOptions::backward();
    let client = CLIENT.lock().await;
    let client = client.as_ref().unwrap();

    let room_id = <&RoomId>::try_from(room_id).unwrap();
    let room = client.get_joined_room(room_id).unwrap();

    let messages = room.messages(options).await.unwrap();

    let messages = serde_json::to_value(
        messages
            .chunk
            .iter()
            .map(|c| c.event.clone())
            .collect::<Vec<_>>(),
    )
    .unwrap();

    Ok(messages)
}

fn main() {
    // tauri::async_runtime::block_on(async {
    //     let dir = dirs::data_dir().unwrap().join("matrix-client").join("sled");
    //     let store = sled::open(dir).unwrap();
    //     let session: Option<Session> = store.get("session").unwrap().and_then(|s| {
    //         println!("{:?}", s);
    //         serde_json::from_slice(&s).ok()
    //     });

    //     if let Some(session) = session {
    //         let client = Client::builder()
    //             .homeserver_url("https://matrix.org")
    //             .handle_refresh_tokens()
    //             .build()
    //             .await
    //             .unwrap();

    //         client.restore_login(session).await.unwrap();

    //         client.sync_once(SyncSettings::new()).await.unwrap();

    //         let mut client_mutex = CLIENT.lock().await;
    //         client_mutex.replace(client);

    //         drop(client_mutex);
    //         sync_loop();
    //     }
    // });

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_messages,
            get_room_children,
            is_logged_in,
            login_sso,
            login_redirect,
            login,
            logout,
            rooms,
            user_profile,
            user_info
        ])
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
