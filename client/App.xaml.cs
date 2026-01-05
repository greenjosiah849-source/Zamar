using System.Windows;
using ZamarPlayer.Services;

namespace ZamarPlayer
{
    public partial class App : Application
    {
        private AuthService _authService;
        private ClientManager _clientManager;

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
            
            _authService = new AuthService("https://api.zamar.com");
            _clientManager = new ClientManager(_authService);
            
            MainWindow = new Views.BootstrapWindow();
            MainWindow.Show();
        }

        protected override void OnExit(ExitEventArgs e)
        {
            _clientManager?.Shutdown();
            base.OnExit(e);
        }
    }
}
