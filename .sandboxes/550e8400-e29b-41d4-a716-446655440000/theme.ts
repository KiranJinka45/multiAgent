import { ThemeProvider, defaultTheme } from "@styled-system/theme";

            const theme = {
                ...defaultTheme,
                colors: {
                    primary: "${process.env.THEME_PRIMARY_COLOR}",
                    secondary: "${process.env.THEME_SECONDARY_COLOR}",
                    text: "${process.env.THEME_TEXT_COLOR}",
                },
            };

            export default theme;