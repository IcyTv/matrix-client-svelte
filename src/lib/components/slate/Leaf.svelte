<svelte:options immutable />

<script lang="ts" context="module">
	import type { marked } from 'marked';
	import type { Text } from 'slate';

	type MarkedTokenType = marked.Token['type'] | 'punctuation' | 'codeAnnotation';

	type ITextOptions = Partial<
		Omit<
			{
				[key in MarkedTokenType]: boolean;
			},
			'text'
		>
	> & {
		lang?: string;
	};

	export interface IText extends Text, ITextOptions {}
</script>

<script lang="ts">
	export let leaf: IText;

	const languages = [
		'markup',
		'css',
		'clike',
		'javascript',
		'abap',
		'actionscript',
		'ada',
		'apacheconf',
		'apl',
		'applescript',
		'arduino',
		'arff',
		'asciidoc',
		'asm6502',
		'aspnet',
		'autohotkey',
		'autoit',
		'bash',
		'basic',
		'batch',
		'bison',
		'brainfuck',
		'bro',
		'c',
		'csharp',
		'cpp',
		'coffeescript',
		'clojure',
		'crystal',
		'csp',
		'css-extras',
		'd',
		'dart',
		'diff',
		'django',
		'docker',
		'eiffel',
		'elixir',
		'elm',
		'erb',
		'erlang',
		'fsharp',
		'flow',
		'fortran',
		'gedcom',
		'gherkin',
		'git',
		'glsl',
		'gml',
		'go',
		'graphql',
		'groovy',
		'haml',
		'handlebars',
		'haskell',
		'haxe',
		'http',
		'hpkp',
		'hsts',
		'ichigojam',
		'icon',
		'inform7',
		'ini',
		'io',
		'j',
		'java',
		'jolie',
		'json',
		'julia',
		'keyman',
		'kotlin',
		'latex',
		'less',
		'liquid',
		'lisp',
		'livescript',
		'lolcode',
		'lua',
		'makefile',
		'markdown',
		'markup-templating',
		'matlab',
		'mel',
		'mizar',
		'monkey',
		'n4js',
		'nasm',
		'nginx',
		'nim',
		'nix',
		'nsis',
		'objectivec',
		'ocaml',
		'opencl',
		'oz',
		'parigp',
		'parser',
		'pascal',
		'perl',
		'php',
		'php-extras',
		'plsql',
		'powershell',
		'processing',
		'prolog',
		'properties',
		'protobuf',
		'pug',
		'puppet',
		'pure',
		'python',
		'q',
		'qore',
		'r',
		'jsx',
		'tsx',
		'renpy',
		'reason',
		'rest',
		'rip',
		'roboconf',
		'ruby',
		'rust',
		'sas',
		'sass',
		'scss',
		'scala',
		'scheme',
		'smalltalk',
		'smarty',
		'sql',
		'soy',
		'stylus',
		'swift',
		'tap',
		'tcl',
		'textile',
		'tt2',
		'twig',
		'typescript',
		'vbnet',
		'velocity',
		'verilog',
		'vhdl',
		'vim',
		'visual-basic',
		'wasm',
		'wiki',
		'xeora',
		'xojo',
		'xquery',
		'yaml',
	];

	$: langIsValid = leaf.lang && languages.includes(leaf.lang);
</script>

<span
	data-slate-leaf="true"
	class:bold={leaf.strong}
	class:isItalic={leaf.em}
	class:code={leaf.codespan}
	class:strike={leaf.del}
	class:punctuation={leaf.punctuation}
	class:codeAnnotation={leaf.codeAnnotation}
	class:validLanguage={langIsValid}
>
	<slot />
</span>

<style>
	.bold {
		@apply font-bold;
	}
	.isItalic {
		@apply italic;
	}
	.code {
		@apply rounded bg-gray-800 font-mono font-light;
	}

	.codeAnnotation {
		@apply text-slate-400;
	}

	.validLanguage {
		@apply text-green-600;
	}

	.strike {
		@apply line-through;
	}

	.punctuation {
		@apply text-slate-400;
	}
</style>
