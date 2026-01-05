using System;
using System.Windows.Input;

namespace ZamarPlayer.Controllers
{
    /// <summary>
    /// Input Controller - Manages keyboard and mouse input
    /// </summary>
    public class InputController
    {
        private PlayerInput _currentInput;
        private bool[] _keysDown = new bool[256];
        private float _mouseSensitivity = 1.0f;

        public InputController()
        {
            _currentInput = new PlayerInput();
        }

        /// <summary>
        /// Handle key down event
        /// </summary>
        public void HandleKeyDown(Key key)
        {
            int keyCode = (int)key;
            if (keyCode < 256)
                _keysDown[keyCode] = true;

            switch (key)
            {
                case Key.W:
                    _currentInput.MoveY = 1.0f;
                    break;
                case Key.S:
                    _currentInput.MoveY = -1.0f;
                    break;
                case Key.A:
                    _currentInput.MoveX = -1.0f;
                    break;
                case Key.D:
                    _currentInput.MoveX = 1.0f;
                    break;
                case Key.Space:
                    _currentInput.Jump = true;
                    break;
                case Key.LeftShift:
                    _currentInput.Sprint = true;
                    break;
            }
        }

        /// <summary>
        /// Handle key up event
        /// </summary>
        public void HandleKeyUp(Key key)
        {
            int keyCode = (int)key;
            if (keyCode < 256)
                _keysDown[keyCode] = false;

            switch (key)
            {
                case Key.W:
                case Key.S:
                    _currentInput.MoveY = 0.0f;
                    break;
                case Key.A:
                case Key.D:
                    _currentInput.MoveX = 0.0f;
                    break;
                case Key.Space:
                    _currentInput.Jump = false;
                    break;
                case Key.LeftShift:
                    _currentInput.Sprint = false;
                    break;
            }
        }

        /// <summary>
        /// Handle mouse move event
        /// </summary>
        public void HandleMouseMove(float deltaX, float deltaY)
        {
            _currentInput.LookX = deltaX * _mouseSensitivity;
            _currentInput.LookY = deltaY * _mouseSensitivity;
        }

        /// <summary>
        /// Handle mouse click event
        /// </summary>
        public void HandleMouseClick(MouseButton button)
        {
            if (button == MouseButton.Left)
                _currentInput.Attack = true;
        }

        /// <summary>
        /// Handle mouse release event
        /// </summary>
        public void HandleMouseRelease(MouseButton button)
        {
            if (button == MouseButton.Left)
                _currentInput.Attack = false;
        }

        /// <summary>
        /// Get current input state
        /// </summary>
        public PlayerInput GetCurrentInput() => _currentInput;

        /// <summary>
        /// Set mouse sensitivity
        /// </summary>
        public void SetMouseSensitivity(float sensitivity)
        {
            _mouseSensitivity = Math.Max(0.1f, Math.Min(10.0f, sensitivity));
        }

        /// <summary>
        /// Reset all input
        /// </summary>
        public void ResetInput()
        {
            _currentInput = new PlayerInput();
            Array.Clear(_keysDown, 0, _keysDown.Length);
        }

        /// <summary>
        /// Check if key is down
        /// </summary>
        public bool IsKeyDown(Key key)
        {
            int keyCode = (int)key;
            return keyCode < 256 && _keysDown[keyCode];
        }
    }
}
