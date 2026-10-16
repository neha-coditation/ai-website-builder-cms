# Phase 11 — Global style tokens

Website Settings now includes primary/button color, body text color, page background color, and website font family (Inter, Arial, Georgia, System UI). These values live in the existing Site.globalDesign JSON field and require no additional database migration beyond Phase 10. The designer applies these tokens to the canvas and uses block-level text/background colors as overrides.

Local smoke test: open Website Settings, change colors and font, Save, open Designer, and switch pages to verify the same defaults. Set a block's explicit color to confirm its override is preserved. Refresh to confirm persistence.

Known limitations: no custom font uploads, token naming, breakpoint-specific tokens, global spacing scale, or published-site rendering. Branch is not build/browser-tested. Admin endpoints remain unauthenticated.
