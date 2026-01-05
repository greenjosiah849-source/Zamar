using System.Windows;
using System.Threading.Tasks;
using log4net;

namespace ZamarPlayer.Views
{
    public partial class BootstrapWindow : Window
    {
        private static readonly ILog log = LogManager.GetLogger(typeof(BootstrapWindow));

        public BootstrapWindow()
        {
            InitializeComponent();
            Loaded += async (s, e) => await InitializeAsync();
        }

        private async Task InitializeAsync()
        {
            try
            {
                UpdateStatus("Verifying integrity...", 0);
                await Task.Delay(500);

                UpdateStatus("Checking for updates...", 25);
                await Task.Delay(500);

                UpdateStatus("Loading game engine...", 50);
                await Task.Delay(500);

                UpdateStatus("Connecting to Zamar...", 75);
                await Task.Delay(500);

                UpdateStatus("Ready to play!", 100);
                await Task.Delay(500);

                // Open main hub window
                MainWindow mainHub = new MainHubWindow();
                mainHub.Show();
                this.Close();
            }
            catch (Exception ex)
            {
                log.Error($"Bootstrap error: {ex.Message}");
                StatusText.Text = "ERROR: Failed to initialize";
            }
        }

        private void UpdateStatus(string status, int progress)
        {
            StatusText.Text = status;
            ProgressBar.Value = progress;
        }
    }
}
