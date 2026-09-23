const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

async function run() {
  const file = { path: 'test.txt', originalname: 'test.txt' };
  fs.writeFileSync('test.txt', 'Hello world');
  try {
      const Markitdown = require('markitdown-js').default || require('markitdown-js');
      const converter = new Markitdown({
        llmCall: async ({ messages, base64Image, file: mediaFile }) => {
          return null;
        }
      });
      const extension = path.extname(file.originalname);
      const result = await converter.convert(file.path, { fileExtension: extension });
      const markdown = result.textContent;
      console.log("SUCCESS:", markdown);
  } catch (error) {
      console.error('MarkItDown error:', error);
  }
}
run();
