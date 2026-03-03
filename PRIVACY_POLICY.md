# Privacy Policy for Map Location & Route Extractor

**Effective Date:** March 3, 2026

This Privacy Policy describes how the "Map Location & Route Extractor" Chrome Extension ("the Extension") handles your data. We are committed to protecting your privacy and ensuring transparency about our practices.

## 1. Information Collection and Use

The Extension is designed to operate entirely locally within your browser. 

*   **No Data Collection:** We do not collect, store, transmit, or share any personal information, browsing history, or identifying data.
*   **Local Processing:** When you click the Extension icon, it temporarily reads the Document Object Model (DOM) of the webpage you are currently viewing. This is done solely to identify and extract map-related information (such as Google Maps links, OpenStreetMap links, coordinates, or directions). 
*   **No External Servers:** The extracted information is processed on your device and displayed directly to you in the Extension's popup interface. No data is ever sent to any external servers, APIs, or third parties by the Extension.

## 2. Permissions Justification

To function correctly, the Extension requires the following permissions:

*   **`activeTab`:** This permission allows the Extension to access the content of the specific tab you are currently viewing *only* when you explicitly activate the Extension by clicking its icon. This is necessary to scan the current page for map links and coordinates.
*   **Host Permissions (`*://*/*` or specific hosts via content scripts):** This pattern allows the Extension's content scripts to inspect embedded map frames (iframes) that may originate from different domains (like `maps.google.com` or `openstreetmap.org`) within the page you are visiting. This is required to extract locations from embedded maps that would otherwise be isolated by browser security policies.

## 3. Remote Code

The Extension **does not** use any remote code. All logic, scripts, and styling required for the Extension to function are bundled within the extension package itself.

## 4. Third-Party Links

The Extension identifies and provides links to third-party services (like Google Maps or OpenStreetMap) based on the content of the pages you visit. Clicking these links will take you to those third-party websites, which have their own privacy policies. We are not responsible for the privacy practices of these external sites.

## 5. Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Effective Date" at the top.

## 6. Contact Us

If you have any questions or suggestions about our Privacy Policy, please contact the developer via the GitHub repository where this extension is hosted.
