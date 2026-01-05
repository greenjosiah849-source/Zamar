using System;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Input;
using System.Windows.Threading;
using ZamarPlayer.Controllers;
using ZamarPlayer.Services;

namespace ZamarPlayer.Views
{
    public partial class GameWindow : Window
    {
        private GameSessionService _gameSessionService;
        private MultiplayerService _multiplayerService;
        private GameLauncherController _launcherController;
        private PlayerController _playerController;
        private InputController _inputController;
        private CameraController _cameraController;

        private DispatcherTimer _gameLoopTimer;
        private DispatcherTimer _fpsTimer;
        private int _frameCount = 0;
        private int _fps = 60;
        private bool _isPaused = false;
        private float _lastMouseX = 0;
        private float _lastMouseY = 0;

        public GameWindow(string gameId, string joinToken, GameSessionService sessionService)
        {
            InitializeComponent();

            _gameSessionService = sessionService;
            _inputController = new InputController();
            _cameraController = new CameraController();

            // Initialize services
            _multiplayerService = new MultiplayerService(_gameSessionService);
            _launcherController = new GameLauncherController(_gameSessionService, _multiplayerService);

            InitializeGameLoop();
            _ = InitializeGameAsync(gameId, joinToken);
        }

        private async System.Threading.Tasks.Task InitializeGameAsync(string gameId, string joinToken)
        {
            try
            {
                LoadingStatusText.Text = "Initializing player...";

                // Get game details
                var gameDetails = await _launcherController.GetGameDetailsAsync(gameId);
                GameName = gameDetails?.name ?? "Game";

                // Create player
                var playerData = new
                {
                    id = Guid.NewGuid().ToString(),
                    name = _gameSessionService.GetToken(),
                    level = 1,
                    health = 100
                };

                _playerController = new PlayerController(playerData);

                LoadingStatusText.Text = "Connecting to server...";

                // Connect to multiplayer
                var connected = await _multiplayerService.ConnectToGameAsync("localhost:8080", joinToken);

                if (connected)
                {
                    LoadingStatusText.Text = "Loading assets...";

                    // Subscribe to updates
                    _multiplayerService.SubscribeToUpdates(OnPlayerUpdate);

                    // Hide loading screen and start game
                    Dispatcher.Invoke(() =>
                    {
                        LoadingScreen.Visibility = Visibility.Hidden;
                        GameCanvas.Focus();
                    });
                }
                else
                {
                    LoadingStatusText.Text = "Connection failed!";
                    await System.Threading.Tasks.Task.Delay(2000);
                    Close();
                }
            }
            catch (Exception ex)
            {
                LoadingStatusText.Text = $"Error: {ex.Message}";
                await System.Threading.Tasks.Task.Delay(2000);
                Close();
            }
        }

        private void InitializeGameLoop()
        {
            // Main game loop (60 FPS)
            _gameLoopTimer = new DispatcherTimer();
            _gameLoopTimer.Interval = TimeSpan.FromMilliseconds(16.67); // ~60 FPS
            _gameLoopTimer.Tick += GameLoop_Tick;
            _gameLoopTimer.Start();

            // FPS counter
            _fpsTimer = new DispatcherTimer();
            _fpsTimer.Interval = TimeSpan.FromSeconds(1);
            _fpsTimer.Tick += (s, e) =>
            {
                _fps = _frameCount;
                FpsText.Text = _fps.ToString();
                _frameCount = 0;
            };
            _fpsTimer.Start();
        }

        private void GameLoop_Tick(object sender, EventArgs e)
        {
            _frameCount++;

            if (_isPaused)
                return;

            float deltaTime = 0.0167f; // 16.67ms

            // Update input
            var input = _inputController.GetCurrentInput();
            _playerController.UpdateInput(input);

            // Update animation
            _playerController.UpdateAnimation(deltaTime);

            // Update camera
            var movementState = _playerController.GetMovementState();
            _cameraController.UpdatePosition(
                movementState.PositionX,
                movementState.PositionY,
                movementState.PositionZ,
                deltaTime
            );

            // Send input to server
            _multiplayerService.SendPlayerInput(input);

            // Update HUD
            UpdateHUD();

            // Render game
            RenderGame();
        }

        private void UpdateHUD()
        {
            // Update player count and stats
            PlayersCountText.Text = "1"; // Would be from server
            PingText.Text = "45ms"; // Would be calculated

            // Update player stats
            HealthText.Text = "100 / 100";
            HealthBar.Value = 100;
            ScoreText.Text = "1500";
            KillsText.Text = "5";
            DeathsText.Text = "2";
        }

        private void RenderGame()
        {
            // Clear canvas
            GameCanvas.Children.Clear();

            // Draw game world (would use 3D renderer in real implementation)
            // For now, draw simple 2D representation

            var movementState = _playerController.GetMovementState();
            var animState = _playerController.GetAnimationState();

            // Draw player indicator
            var playerRect = new System.Windows.Shapes.Rectangle
            {
                Width = 20,
                Height = 20,
                Fill = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0, 215, 255)),
                Opacity = 0.7
            };

            Canvas.SetLeft(playerRect, GameCanvas.ActualWidth / 2 - 10);
            Canvas.SetTop(playerRect, GameCanvas.ActualHeight / 2 - 10);
            GameCanvas.Children.Add(playerRect);

            // Draw animation state
            var animText = new TextBlock
            {
                Text = $"Animation: {animState.CurrentAnimation}",
                Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(255, 0, 110)),
                FontSize = 12,
                Margin = new Thickness(10)
            };
            Canvas.SetTop(animText, 70);
            GameCanvas.Children.Add(animText);

            // Draw movement state
            var moveText = new TextBlock
            {
                Text = $"Movement: {(movementState.IsMoving ? "Moving" : "Idle")} {(movementState.IsJumping ? "[Jump]" : "")}",
                Foreground = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0, 215, 255)),
                FontSize = 12,
                Margin = new Thickness(10)
            };
            Canvas.SetTop(moveText, 90);
            GameCanvas.Children.Add(moveText);

            // Draw minimap
            UpdateMinimap();
        }

        private void UpdateMinimap()
        {
            Minimap.Children.Clear();

            var playerDot = new System.Windows.Shapes.Ellipse
            {
                Width = 10,
                Height = 10,
                Fill = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(0, 215, 255))
            };

            Canvas.SetLeft(playerDot, 70);
            Canvas.SetTop(playerDot, 70);
            Minimap.Children.Add(playerDot);
        }

        private void OnPlayerUpdate(dynamic data)
        {
            Dispatcher.Invoke(() =>
            {
                // Update with server state
                try
                {
                    PlayersCountText.Text = data.playersOnline?.ToString() ?? "0";
                    PingText.Text = $"{data.latency}ms";
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error updating from server: {ex.Message}");
                }
            });
        }

        // Input handling
        private void Window_KeyDown(object sender, KeyEventArgs e)
        {
            _inputController.HandleKeyDown(e.Key);

            if (e.Key == Key.Escape)
            {
                TogglePause();
            }
        }

        private void Window_KeyUp(object sender, KeyEventArgs e)
        {
            _inputController.HandleKeyUp(e.Key);
        }

        private void Window_MouseMove(object sender, MouseEventArgs e)
        {
            var pos = e.GetPosition(this);
            float deltaX = (float)(pos.X - _lastMouseX);
            float deltaY = (float)(pos.Y - _lastMouseY);

            _lastMouseX = (float)pos.X;
            _lastMouseY = (float)pos.Y;

            _inputController.HandleMouseMove(deltaX, deltaY);
            _cameraController.Rotate(deltaX, deltaY);
        }

        private void Window_MouseDown(object sender, MouseButtonEventArgs e)
        {
            if (e.LeftButton == MouseButtonState.Pressed)
                _inputController.HandleMouseClick(MouseButton.Left);
        }

        private void Window_MouseUp(object sender, MouseButtonEventArgs e)
        {
            if (e.LeftButton == MouseButtonState.Released)
                _inputController.HandleMouseRelease(MouseButton.Left);
        }

        private void TogglePause()
        {
            _isPaused = !_isPaused;
            PauseMenu.Visibility = _isPaused ? Visibility.Visible : Visibility.Hidden;

            if (_isPaused)
            {
                _gameLoopTimer.Stop();
            }
            else
            {
                _gameLoopTimer.Start();
            }
        }

        private void Settings_Click(object sender, RoutedEventArgs e)
        {
            TogglePause();
        }

        private void Resume_Click(object sender, RoutedEventArgs e)
        {
            TogglePause();
        }

        private void OpenSettings_Click(object sender, RoutedEventArgs e)
        {
            // Open settings dialog
        }

        private void LeaveGame_Click(object sender, RoutedEventArgs e)
        {
            _multiplayerService.Disconnect();
            Close();
        }

        private void ChatInput_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Return && !_isPaused)
            {
                string message = ChatInput.Text;
                if (!string.IsNullOrWhiteSpace(message))
                {
                    // Send chat message
                    _multiplayerService.SendPlayerInput(new PlayerInput
                    {
                        MoveX = 0,
                        MoveY = 0,
                        LookX = 0,
                        LookY = 0,
                        Jump = false,
                        Sprint = false,
                        Attack = false
                    });

                    ChatInput.Clear();
                }
            }
        }

        private void Window_Closed(object sender, EventArgs e)
        {
            _gameLoopTimer?.Stop();
            _fpsTimer?.Stop();
            _multiplayerService?.Disconnect();
        }

        public string GameName
        {
            get { return (string)GetValue(GameNameProperty); }
            set { SetValue(GameNameProperty, value); }
        }

        public static readonly DependencyProperty GameNameProperty =
            DependencyProperty.Register("GameName", typeof(string), typeof(GameWindow), new PropertyMetadata("Game"));
    }

    public class ChatMessage
    {
        public string PlayerName { get; set; }
        public string Text { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class PlayerInfo
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public int Score { get; set; }
        public int Health { get; set; }
    }
}
