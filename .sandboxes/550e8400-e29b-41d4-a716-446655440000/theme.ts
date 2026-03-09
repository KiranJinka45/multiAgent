import { ThemeProvider, defaultTheme } from "@styled-system/theme";

const theme = {
    ...defaultTheme,
    colors: {
        primary: "{primaryColor}",
        secondary: "{secondaryColor}",
        text: "{textColor}",
    },
};

export default theme;
