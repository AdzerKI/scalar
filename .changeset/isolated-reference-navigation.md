---
'@scalar/api-reference': patch
---

Keep lazy rendering and schema navigation state local to each embedded reference, and cancel pending rendering and scroll work on unmount. Remove browser-history listeners and restore host scroll restoration after the last reference unmounts.
