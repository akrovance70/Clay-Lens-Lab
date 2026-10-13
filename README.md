# Clay Lens Lab — Independent Shooting Optics Reference
*A CloudScout Studio Field Guide & Research Resource*

An independent, zero-dependency, open-source reference tool designed for clay-target shooting enthusiasts (Sporting Clays, FITASC, Skeet, and Trap), developed and published by CloudScout Studio. 

Clay Lens Lab indexes **43 Pilla Outlaw shooting-glasses lenses**, providing interactive comparison across visible light transmission (VLT), chemical filtration families, documented lighting conditions, and transparent suitability screening heuristics.

---

## 🛡️ Independent Educational Reference & Non-Affiliation

**Clay Lens Lab is an independent educational reference resource.** 
- It is **not** affiliated with, sponsored by, or endorsed by Pilla Sport or Carl Zeiss Vision.
- No proprietary logos, trademarks, or copyrighted product imagery are used.
- All suitability ratings are mathematical screening heuristics based on published transmission specs and dealer field notes.
- **Ratings are not manufacturer-certified optical performance measurements.**
- No eyewear impact safety certification, ballistic certification, or prescription optical claims are made.
- Blue eyes or eye color alone does not dictate lens choice.

---

## 🚀 Key Features

1. **Authoritative Canonical Dataset (`data/pilla_lenses.json`)**:
   - Single authoritative source for all 43 Outlaw lenses.
   - Comprehensive provenance fields: `sourceUrl`, `sourceType`, `verifiedDate`, and `verificationStatus`.
   - Preserves disputed catalog classifications (e.g. `80CMOS` flagged with historical distributor variance notes).

2. **Personalize Your Rankings (User-Weighted Heuristics)**:
   - Three interactive sliders for **Direct Sunshine**, **Overcast Skies**, and **Dormant Brown Terrain**.
   - Normalized weighted composite score calculation:
     $$\text{Composite Score} = \frac{W_{\text{sun}} \cdot \text{Sun} + W_{\text{cloud}} \cdot \text{Cloud} + W_{\text{brown}} \cdot \text{Brown}}{W_{\text{total}}}$$
   - Instant live recalculation, quick presets (*Bright Sun*, *Overcast*, *Dormant Brown*, *Balanced*), and safe zero-weight handling.
   - Distinct separation of published specifications vs. calculated screening heuristics.

3. **4-Lens Side-by-Side Comparison Comparator**:
   - Select up to 4 lenses from the catalog to inspect in a unified matrix.
   - Transposed comparative matrix highlighting VLT, technology, color profiles, environments, lighting, and calculated ratings.
   - One-click removal and "Export Comparison (CSV)".

4. **Dual RFC-4180 CSV Export**:
   - **Export Filtered Results (CSV)**: Downloads all currently filtered lenses with complete specification and heuristic columns.
   - **Export Comparison Matrix (CSV)**: Transposed comparison matrix ready for range bag printouts or offline spreadsheets.
   - Full quotation escaping and UTF-8 BOM encoding for clean Excel viewing.

5. **Visual Design & Responsive Layout**:
   - Ballistic navy and clay blaze orange theme tailored for shooting enthusiasts.
   - Illustrative tint swatches (clearly labeled as visual approximations, not spectrophotometric simulations).
   - Visual VLT spectrum transmission bars.
   - Dual view toggle: Responsive Desktop/Tablet Table View and Smartphone Card View.

6. **Built-in Automated Test Suite**:
   - Accessible via [`tests/test_suite.html`](file:///c:/GitHub/Clay%20Lens%20Lab/tests/test_suite.html) in the browser.
   - Automated checks covering catalog completeness, identifier uniqueness, base heuristics, weighted scoring, presets, zero-weight safety, comparison constraints, and CSV escaping.

---

## 📂 Repository File Structure

```
c:\GitHub\Clay Lens Lab\
├── index.html                   # Production-ready web application entrypoint (GitHub Pages root)
├── pilla_lens_explorer.html     # Preserved original application (regression baseline)
├── README.md                    # Project documentation, methodology, and deployment guide
├── data/
│   └── pilla_lenses.json        # Canonical JSON dataset (43 lenses + provenance metadata)
├── css/
│   ├── main.css                 # Design tokens, typography, layout, and header/footer styling
│   └── components.css           # Table, sliders, comparison matrix, mobile cards, modal
├── js/
│   ├── app.js                   # Application bootstrap, state management, and DOM coordination
│   ├── heuristics.js            # Isolated scoring engine & weighted personalization formulas
│   ├── comparison.js            # 4-lens side-by-side comparator manager
│   ├── export.js                # RFC-4180 compliant CSV export generator
│   └── ui.js                    # UI formatting helpers, color swatches, badges, and VLT bars
└── tests/
    └── test_suite.html          # In-browser automated test runner verifying all requirements
```

---

## 🧪 Local Development & Testing

Clay Lens Lab is built with lightweight Vanilla HTML, CSS, and modern ES Modules. It requires no build step, no compiler, and no node_modules.

Because modern browsers restrict `fetch()` across the `file://` protocol due to CORS, run a simple local HTTP server:

### Using Python:
```bash
# In the repository root:
python -m http.server 8000
```
Then navigate to: `http://localhost:8000/index.html`

### Using Node / npx:
```bash
npx serve .
# or
npx http-server .
```

### Running the Automated Test Suite:
Navigate to: `http://localhost:8000/tests/test_suite.html`
All test groups will execute automatically and report pass/fail statuses.

---

## 🌐 GitHub Pages Deployment Guide

Deploying Clay Lens Lab to GitHub Pages takes less than a minute:

1. Push this repository to GitHub (e.g. `https://github.com/<your-username>/clay-lens-lab`).
2. In your repository on GitHub, click **Settings** $\to$ **Pages** (under the "Code and automation" section).
3. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`.
   - **Branch**: Select `main` (or `master`), and set folder to `/ (root)`.
4. Click **Save**.
5. Within 1–2 minutes, GitHub will publish the site at:
   `https://<your-username>.github.io/clay-lens-lab/`

Because the app is fully static and assets use relative paths, it deploys cleanly with zero additional configuration or build steps.

---

## 🌐 Squarespace Integration & Iframe Embedding (CloudScout Studio)

Clay Lens Lab is engineered to run seamlessly both as a standalone website on **GitHub Pages** and embedded within your **CloudScout Studio Squarespace website**.

### Key Architectural Benefits:
- **Zero Parent Dependencies**: Self-contained CSS and JavaScript that do not interfere with Squarespace's templates, Fluid Engine, or global styling.
- **Dynamic Cross-Origin Height Resizing**: Uses `window.postMessage` and `ResizeObserver` to automatically match iframe height to content height, eliminating awkward nested double scrollbars.
- **Responsive Layout**: Adapts from full-width desktop monitors down to mobile viewports.
- **Standalone Independence**: The GitHub Pages URL continues to operate as an independent public reference.

---

### Method A: Responsive Dynamic Embed (Recommended)
This method includes a lightweight script listener that automatically adjusts the iframe's height whenever filters change or the comparison drawer expands.

#### Step 1: Add a Code Block in Squarespace
1. In Squarespace, navigate to the page where you wish to publish the resource (e.g. `/clay-lens-lab` or `/resources/optics`).
2. Click **Edit** on the page section.
3. Click **Add Block** $\to$ select **Code**.
4. In the Code Block settings, set **Mode** to `HTML` and ensure **Display Source** is toggled **Off**.
5. Paste the snippet below, replacing the placeholder URL with your live GitHub Pages address:

```html
<!-- CloudScout Studio — Clay Lens Lab Responsive Embed -->
<div id="clay-lens-lab-wrapper" style="width: 100%; position: relative; overflow: hidden; clear: both;">
  <iframe
    id="clay-lens-lab-frame"
    src="https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY-NAME/"
    title="Clay Lens Lab — Independent Pilla Outlaw Shooting Optics Reference"
    style="width: 100%; border: none; min-height: 950px; display: block; transition: height 0.25s ease;"
    loading="lazy"
    scrolling="no"
    allow="clipboard-write"
  ></iframe>
</div>

<!-- Cross-origin height synchronizer (eliminates double scrollbars) -->
<script>
  (function() {
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'clay-lens-lab:resize' && typeof event.data.height === 'number') {
        var frame = document.getElementById('clay-lens-lab-frame');
        if (frame) {
          frame.style.height = (event.data.height + 24) + 'px';
        }
      }
    });
  })();
</script>
```

#### Step 2: Configure Layout Width in Squarespace
- **Fluid Engine (Squarespace 7.1)**: Drag the bounding box of the Code Block to fill the full width of your grid canvas (or toggle Section Settings $\to$ Format $\to$ Full Bleed).
- **Classic Editor (Squarespace 7.0)**: Ensure the Code Block is not constrained by adjacent spacer blocks.

---

### Method B: Standard Fixed-Height Fallback Embed
If your Squarespace plan or security policy restricts inline `<script>` tags, use this pure HTML fallback. It provides an independent scroll container:

```html
<iframe
  src="https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY-NAME/"
  title="Clay Lens Lab — Independent Pilla Outlaw Shooting Optics Reference"
  style="width: 100%; height: 1250px; border: none; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.06);"
  loading="lazy"
></iframe>
```

---

## 📚 Sources & Verified Documentation

Specifications were audited and transcribed from published reference documentation:
- **Starkey Outdoor Pilla Filtration Guide (Authorized UK Dealer)**: [`https://starkeyoutdoor.co.uk/pages/which-pilla-lens-is-right-for-you`](https://starkeyoutdoor.co.uk/pages/which-pilla-lens-is-right-for-you)
- **Pilla Sport Official Solid Filtrations Technology Guide**: [`https://pillasport.com/pages/solid-filtrations`](https://pillasport.com/pages/solid-filtrations)
- **Pilla Sport Outlaw Series Architecture**: [`https://pillasport.com/products/x7-custom-rx-kit`](https://pillasport.com/products/x7-custom-rx-kit)

---

## ⚖️ License & Disclaimers

This project is licensed for educational and non-commercial informational reference. All trademarks and brand names referenced (Pilla, Outlaw, Chromashift, ZEISS) are the property of their respective owners and are mentioned solely for identification and descriptive comparison purposes.
