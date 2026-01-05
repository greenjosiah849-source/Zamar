using System;
using System.Windows;
using log4net;

namespace ZamarStudio
{
    public partial class App : Application
    {
        private static readonly ILog log = LogManager.GetLogger(typeof(App));

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            log4net.Config.XmlConfigurator.Configure();
            log.Info("Zamar Studio started");

            // Handle uncaught exceptions
            AppDomain.CurrentDomain.UnhandledException += (s, ex) =>
            {
                log.Error("Unhandled exception", ex.ExceptionObject as Exception);
                MessageBox.Show("An error occurred. Check logs for details.");
            };

            DispatcherUnhandledException += (s, e) =>
            {
                log.Error("Dispatcher unhandled exception", e.Exception);
                e.Handled = true;
            };
        }
    }
}
