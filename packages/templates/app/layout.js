"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const google_1 = require("next/font/google");
require("./globals.css");
const inter = (0, google_1.Inter)({ subsets: ["latin"] });
exports.metadata = {
    title: "AI Generated App",
    description: "Built in 10 seconds with MultiAgent",
};
function RootLayout({ children, }) {
    return (<html lang="en">
            <body className={`${inter.className} bg-slate-950 text-slate-50`}>{children}</body>
        </html>);
}
//# sourceMappingURL=layout.js.map