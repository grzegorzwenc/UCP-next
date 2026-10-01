# Architecture documents

- `cms-architecture.html`: the UCP CMS architecture as one page. It covers the logical system (the target state, with the
  components/templates and business-logic packages), the Digital Assets service and its AWS hosting, the module map
  and channels in the current code, the inline-edit and review/publish flows, and module responsibilities. Open it in
  a browser; it needs nothing but Google Fonts.
- `diagrams/*.drawio`: the page's five diagrams as editable draw.io files, one per diagram, for Gliffy on Confluence
  (**Import a Diagram** → pick the file). If an older Gliffy does not offer draw.io import, open the file in
  diagrams.net, export it as Visio (`.vsdx`) and import that.

The page is the source: the `.drawio` files are generated from its SVG, so change a diagram in the page first and then
regenerate them:

```sh
node docs/tools/svg2drawio.mjs docs/cms-architecture.html docs/diagrams
```

The script also writes a standalone `.svg` of each diagram beside the `.drawio` files. Those are for embedding as
images and are not committed.
