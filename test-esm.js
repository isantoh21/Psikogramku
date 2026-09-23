async function run() {
  const m = await import('markitdown-js');
  console.log(Object.keys(m));
  console.log(m.default);
  console.log(m.MarkItDown);
}
run();
