# Read-only Webflow Designer exporter (prototype)

This extension extracts the **currently open Designer page**, available element metadata, class styles, components, and variables to a JSON bundle for the builder's Step 5 intake.

## Set up
1. Register a private Webflow App with Designer Extension capability in your workspace, then install it on the source site. This is separate from the Webflow Data API token.
2. Follow the official Webflow CLI documentation to initialize/serve the extension. The `public/` directory and `webflow.json` are provided here. From this directory run `npx @webflow/webflow-cli extension serve` if supported by your CLI version.
3. Launch the development app from the Webflow Designer Apps panel.
4. On each page, enter the **site ID** and **current page ID** from the builder's API inventory, then click **Extract current page**.
5. Import the downloaded JSON into the builder's Step 5 JSON field, and click **Validate Designer bundle**.

## Limitations
- Designer API element reads are scoped to the current page or component context. Export each page separately; the intake does not yet combine bundles.
- This is a prototype, not a full-fidelity exporter: nested element relationships, breakpoint and pseudo-state styles, complete variable values, CMS bindings, interactions, code, fonts, and assets may be incomplete or unavailable.
- The extension does not publish or modify Webflow. No tokens are embedded or sent to third parties. JSON may contain sensitive site content; store it securely.
- The builder's bundle endpoint validates the data but does not persist it.
- Consult https://developers.webflow.com/designer/reference/introduction for installation and API compatibility.
