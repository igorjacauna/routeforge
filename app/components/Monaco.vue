<script setup lang="ts">
import * as monaco from 'monaco-editor';
// @ts-expect-error: no declaration file for internal module
import { language as tsMonarch } from 'monaco-editor/esm/vs/basic-languages/typescript/typescript';
import { onMounted, ref } from 'vue';

// Configure Monaco Editor workers for Vite
self.MonacoEnvironment = {
  getWorkerUrl: () => {
    return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(`
      self.postMessage({});
    `);
  },
};

const editorContainer = ref<HTMLDivElement | null>(null);

// Função para encontrar as dobras padrão (blocos de código)
function findStandardFoldingRanges(model: monaco.editor.ITextModel): monaco.languages.FoldingRange[] {
  const ranges: monaco.languages.FoldingRange[] = [];
  const text = model.getValue();
  const lines = text.split('\n');
  const bracketStack: { char: string; line: number }[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '{') {
        bracketStack.push({ char, line: lineNumber });
      } else if (char === '}') {
        if (bracketStack.length > 0) {
          const startBracket = bracketStack.pop();
          // eslint-disable-next-line max-depth
          if (startBracket) {
            ranges.push({
              start: startBracket.line,
              end: lineNumber,
              kind: monaco.languages.FoldingRangeKind.Region,
            });
          }
        }
      }
    }
  });

  return ranges;
}

onMounted(() => {
  // Configure TypeScript compiler options
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    allowJs: true,
  });

  // Disable TypeScript diagnostics to avoid worker issues
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
    noSuggestionDiagnostics: true,
  });

  // Configuração básica do TypeScript
  monaco.languages.setMonarchTokensProvider('typescript', {
    ...tsMonarch,
    tokenizer: {
      ...tsMonarch.tokenizer,
      root: [
        ...tsMonarch.tokenizer.root,
        [/^#\s+.*$/, 'comment.header'],
        [/\b(Request|Response)\b/, 'custom.keyword'],
      ],
    },
  });

  monaco.editor.defineTheme('typescript', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment.header', foreground: '6A9955', fontStyle: 'bold' },
      { token: 'custom.keyword', foreground: 'c792ea', fontStyle: 'bold' },
    ],
    colors: {},
  });

  monaco.languages.registerFoldingRangeProvider('typescript', {
    provideFoldingRanges(model) {
      const regions = [];
      let start = null;
      const total = model.getLineCount();

      const isTitle = (text: string) => /^#\s+[^#]+$/.test(text);

      for (let i = 1; i <= total; i++) {
        const line = model.getLineContent(i).trim();

        if (isTitle(line)) {
          if (start !== null && start < i - 1) {
            regions.push({ start, end: i - 1 });
          }
          start = i;
        }
      }
      if (start !== null && start < total) {
        regions.push({ start, end: total });
      }
      const standardRanges = findStandardFoldingRanges(model);
      regions.push(...standardRanges);
      return regions;
    },
  });

  // Cria o editor com TypeScript estendido
  const editor = monaco.editor.create(editorContainer.value!, {
    value: `# A route example
/**
 * @title Example API Contract
 * @description This is a sample API contract for demonstration purposes.
 * @version 1.0.0
 * @author Igor Jacauna
 * @license MIT
 */
GET /api/test

Response {
  message: string;
  items: Array<{
    id: number;
    name: string;
  }>;
  active: boolean; // A comment
  options: ['option1', 'option2', 'option3'];
  values: enum('value1', 'value2', 'value3');
  nested: {
    key: string;
    details: {
      description: string;
      count: number;
    };
  };
  date: Date;
  timestamp: DateTime;
  custom: CustomType;
}`,
    language: 'typescript',
    contextmenu: false,
    theme: 'typescript',
  });

  editor.onDidChangeModelContent(() => {
    // Content changed
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
    try {
      const content = editor.getValue();

      // @ts-expect-error TS ainda não reconhece showSaveFilePicker
      const handle = await window.showSaveFilePicker({
        suggestedName: 'contrato.http',
        types: [{
          description: 'HTTP files',
          accept: { 'text/plain': ['.http'] },
        }],
      });

      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Erro ao salvar arquivo:', err);
    }
  });


  const container = editorContainer.value!;
  container.addEventListener('dragover', (e) => {
    e.preventDefault(); // necessário para permitir drop
    container.style.border = '2px dashed #aaa'; // visual feedback opcional
  });

  container.addEventListener('dragleave', () => {
    container.style.border = 'none';
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    container.style.border = 'none';

    const file = e.dataTransfer?.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result?.toString() ?? '';
        editor.setValue(content);
      };
      reader.readAsText(file);
    }
  });
});
</script>

<template>
  <div ref="editorContainer" class="editor-container"/>
</template>
