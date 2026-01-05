using System;
using System.Windows.Media;

namespace ZamarPlayer.Themes
{
    /// <summary>
    /// Theme system for Zamar Launcher - Roblox-inspired with custom styling
    /// </summary>
    public class ZamarTheme
    {
        public string Name { get; set; }
        public Color PrimaryColor { get; set; }
        public Color SecondaryColor { get; set; }
        public Color BackgroundColor { get; set; }
        public Color TextColor { get; set; }
        public Color AccentColor { get; set; }
        public Color HighlightColor { get; set; }
        public Color ButtonColor { get; set; }
        public Color ButtonHoverColor { get; set; }
        public double Opacity { get; set; }
        public string FontFamily { get; set; }
    }

    /// <summary>
    /// Dark theme - similar to Roblox Studio but custom
    /// </summary>
    public class DarkTheme : ZamarTheme
    {
        public DarkTheme()
        {
            Name = "Dark";
            PrimaryColor = Color.FromRgb(25, 25, 35);          // #191923
            SecondaryColor = Color.FromRgb(35, 35, 45);        // #232d2d
            BackgroundColor = Color.FromRgb(15, 15, 25);       // #0f0f19
            TextColor = Color.FromRgb(220, 220, 220);          // #dcdcdc
            AccentColor = Color.FromRgb(0, 215, 255);          // #00d7ff (Cyan)
            HighlightColor = Color.FromRgb(100, 200, 255);     // #64c8ff
            ButtonColor = Color.FromRgb(45, 45, 60);           // #2d2d3c
            ButtonHoverColor = Color.FromRgb(60, 60, 80);      // #3c3c50
            Opacity = 0.95;
            FontFamily = "Segoe UI";
        }
    }

    /// <summary>
    /// Light theme - modern light variant
    /// </summary>
    public class LightTheme : ZamarTheme
    {
        public LightTheme()
        {
            Name = "Light";
            PrimaryColor = Color.FromRgb(245, 245, 250);       // #f5f5fa
            SecondaryColor = Color.FromRgb(230, 230, 240);     // #e6e6f0
            BackgroundColor = Color.FromRgb(255, 255, 255);    // #ffffff
            TextColor = Color.FromRgb(30, 30, 40);             // #1e1e28
            AccentColor = Color.FromRgb(0, 150, 200);          // #0096c8 (Blue)
            HighlightColor = Color.FromRgb(100, 180, 230);     // #64b4e6
            ButtonColor = Color.FromRgb(220, 220, 235);        // #dcdceb
            ButtonHoverColor = Color.FromRgb(200, 200, 220);   // #c8c8dc
            Opacity = 0.98;
            FontFamily = "Segoe UI";
        }
    }

    /// <summary>
    /// Neon theme - vibrant and energetic
    /// </summary>
    public class NeonTheme : ZamarTheme
    {
        public NeonTheme()
        {
            Name = "Neon";
            PrimaryColor = Color.FromRgb(10, 10, 25);          // #0a0a19
            SecondaryColor = Color.FromRgb(20, 20, 40);        // #141428
            BackgroundColor = Color.FromRgb(5, 5, 15);         // #05050f
            TextColor = Color.FromRgb(200, 255, 200);          // #c8ffc8 (Neon Green)
            AccentColor = Color.FromRgb(255, 0, 255);          // #ff00ff (Magenta)
            HighlightColor = Color.FromRgb(0, 255, 255);       // #00ffff (Cyan)
            ButtonColor = Color.FromRgb(30, 30, 50);           // #1e1e32
            ButtonHoverColor = Color.FromRgb(50, 50, 80);      // #323250
            Opacity = 1.0;
            FontFamily = "Courier New";
        }
    }

    /// <summary>
    /// Theme manager - handles theme switching
    /// </summary>
    public class ThemeManager
    {
        private static ZamarTheme _currentTheme = new DarkTheme();
        public static event EventHandler<ThemeChangedEventArgs> ThemeChanged;

        public static ZamarTheme CurrentTheme
        {
            get => _currentTheme;
            set
            {
                var oldTheme = _currentTheme;
                _currentTheme = value;
                ThemeChanged?.Invoke(null, new ThemeChangedEventArgs(oldTheme, value));
            }
        }

        public static void SetDarkTheme() => CurrentTheme = new DarkTheme();
        public static void SetLightTheme() => CurrentTheme = new LightTheme();
        public static void SetNeonTheme() => CurrentTheme = new NeonTheme();

        public static SolidColorBrush GetPrimaryBrush() => new SolidColorBrush(_currentTheme.PrimaryColor);
        public static SolidColorBrush GetSecondaryBrush() => new SolidColorBrush(_currentTheme.SecondaryColor);
        public static SolidColorBrush GetAccentBrush() => new SolidColorBrush(_currentTheme.AccentColor);
        public static SolidColorBrush GetTextBrush() => new SolidColorBrush(_currentTheme.TextColor);
        public static SolidColorBrush GetButtonBrush() => new SolidColorBrush(_currentTheme.ButtonColor);
        public static SolidColorBrush GetButtonHoverBrush() => new SolidColorBrush(_currentTheme.ButtonHoverColor);
    }

    public class ThemeChangedEventArgs : EventArgs
    {
        public ZamarTheme OldTheme { get; set; }
        public ZamarTheme NewTheme { get; set; }

        public ThemeChangedEventArgs(ZamarTheme oldTheme, ZamarTheme newTheme)
        {
            OldTheme = oldTheme;
            NewTheme = newTheme;
        }
    }
}
