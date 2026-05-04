"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const google_1 = require("next/font/google");
require("./globals.css");
const local_utils_1 = require("@/lib/local-utils");
const inter = (0, google_1.Inter)({ subsets: ["latin"] });
exports.metadata = {
    title: "MultiAgent Premium SaaS",
    description: "Built with Level-5 Autonomous Architecture",
};
function RootLayout({ children, }) {
    return (<html lang="en" className="dark">
      <body className={(0, local_utils_1.cn)(inter.className, "bg-black text-white antialiased")}>
        {children}
      </body>
    </html>);
}
//# sourceMappingURL=layout.js.map