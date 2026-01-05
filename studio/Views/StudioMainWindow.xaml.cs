using System;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using ZamarStudio.ViewModels;

namespace ZamarStudio.Views
{
    public partial class StudioMainWindow : Window
    {
        private GameProject currentProject;
        private Part selectedPart;

        public StudioMainWindow()
        {
            InitializeComponent();
            CreateNewProject();
            SetupToolbar();
            SetupEventHandlers();
        }

        private void CreateNewProject()
        {
            currentProject = new GameProject
            {
                Name = "Untitled Game",
                Description = "A new game created in Zamar Studio"
            };

            // Add sample ground
            var ground = new Part
            {
                Name = "Ground",
                Type = "Block",
                Position = new Vector3D { X = 0, Y = -5, Z = 0 },
                Size = new Vector3D { X = 50, Y = 1, Z = 50 },
                Material = "Concrete",
                Color = "128,128,128",
                Anchored = true,
                CanCollide = true,
            };

            currentProject.Parts.Add(ground);
            UpdatePartsList();
        }

        private void SetupToolbar()
        {
            // Part insertion buttons
            AddToolbarButton("Block", () => InsertPart("Block"));
            AddToolbarButton("Sphere", () => InsertPart("Sphere"));
            AddToolbarButton("Wedge", () => InsertPart("Wedge"));
            AddToolbarButton("Cylinder", () => InsertPart("Cylinder"));
            AddToolbarButton("Script", () => InsertScript());
        }

        private void AddToolbarButton(string name, Action action)
        {
            var btn = new Button
            {
                Content = name,
                Padding = new Thickness(10),
                Margin = new Thickness(5, 0, 0, 0),
            };

            btn.Click += (s, e) => action();
            ToolbarStackPanel.Children.Add(btn);
        }

        private void InsertPart(string type)
        {
            var part = new Part
            {
                Name = $"{type} ({currentProject.Parts.Count + 1})",
                Type = type,
            };

            currentProject.Parts.Add(part);
            UpdatePartsList();
            MessageBox.Show($"Added new {type}!");
        }

        private void InsertScript()
        {
            var script = new GameScript
            {
                Name = $"Script ({currentProject.Scripts.Count + 1})",
                Type = "Server",
            };

            currentProject.Scripts.Add(script);
            UpdateScriptsList();
            MessageBox.Show("Added new script!");
        }

        private void SetupEventHandlers()
        {
            PartsList.SelectionChanged += (s, e) =>
            {
                if (PartsList.SelectedItem is Part part)
                {
                    selectedPart = part;
                    DisplayPartProperties(part);
                }
            };

            ScriptsList.SelectionChanged += (s, e) =>
            {
                if (ScriptsList.SelectedItem is GameScript script)
                {
                    DisplayScriptEditor(script);
                }
            };
        }

        private void UpdatePartsList()
        {
            PartsList.ItemsSource = null;
            PartsList.ItemsSource = currentProject.Parts;
        }

        private void UpdateScriptsList()
        {
            ScriptsList.ItemsSource = null;
            ScriptsList.ItemsSource = currentProject.Scripts;
        }

        private void DisplayPartProperties(Part part)
        {
            PropertiesPanel.Children.Clear();

            AddPropertyRow("Name:", part.Name, (val) => part.Name = val);
            AddPropertyRow("Type:", part.Type, (val) => part.Type = val);
            AddPropertyRow("Material:", part.Material, (val) => part.Material = val);
            AddPropertyRow("Color:", part.Color, (val) => part.Color = val);

            AddPropertyRow("Position X:", part.Position.X.ToString(), (val) =>
            {
                if (decimal.TryParse(val, out var x))
                    part.Position.X = x;
            });

            AddPropertyRow("Position Y:", part.Position.Y.ToString(), (val) =>
            {
                if (decimal.TryParse(val, out var y))
                    part.Position.Y = y;
            });

            AddPropertyRow("Position Z:", part.Position.Z.ToString(), (val) =>
            {
                if (decimal.TryParse(val, out var z))
                    part.Position.Z = z;
            });

            AddPropertyRow("Size X:", part.Size.X.ToString(), (val) =>
            {
                if (decimal.TryParse(val, out var x))
                    part.Size.X = x;
            });

            AddPropertyRow("Size Y:", part.Size.Y.ToString(), (val) =>
            {
                if (decimal.TryParse(val, out var y))
                    part.Size.Y = y;
            });

            AddPropertyRow("Size Z:", part.Size.Z.ToString(), (val) =>
            {
                if (decimal.TryParse(val, out var z))
                    part.Size.Z = z;
            });

            AddPropertyCheckBox("Anchored:", part.Anchored, (val) => part.Anchored = val);
            AddPropertyCheckBox("Can Collide:", part.CanCollide, (val) => part.CanCollide = val);
        }

        private void DisplayScriptEditor(GameScript script)
        {
            ScriptEditorPanel.Children.Clear();

            var titleBlock = new TextBlock
            {
                Text = $"Editing: {script.Name}",
                FontSize = 14,
                FontWeight = System.Windows.FontWeights.Bold,
                Margin = new Thickness(0, 0, 0, 10),
            };

            ScriptEditorPanel.Children.Add(titleBlock);

            var editor = new TextBox
            {
                Text = script.Code,
                AcceptsReturn = true,
                AcceptsTab = true,
                FontFamily = new System.Windows.Media.FontFamily("Courier New"),
                FontSize = 12,
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                HorizontalScrollBarVisibility = ScrollBarVisibility.Auto,
            };

            editor.TextChanged += (s, e) => script.Code = editor.Text;

            ScriptEditorPanel.Children.Add(editor);
            StackPanel.SetFillChildProperty(editor, true);
        }

        private void AddPropertyRow(string label, string value, Action<string> setter)
        {
            var row = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 5, 0, 5) };

            var labelBlock = new TextBlock
            {
                Text = label,
                Width = 120,
                VerticalAlignment = VerticalAlignment.Center,
            };

            var textBox = new TextBox
            {
                Text = value,
                Width = 150,
                Padding = new Thickness(5),
            };

            textBox.TextChanged += (s, e) => setter(textBox.Text);

            row.Children.Add(labelBlock);
            row.Children.Add(textBox);

            PropertiesPanel.Children.Add(row);
        }

        private void AddPropertyCheckBox(string label, bool value, Action<bool> setter)
        {
            var row = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 5, 0, 5) };

            var labelBlock = new TextBlock
            {
                Text = label,
                Width = 120,
                VerticalAlignment = VerticalAlignment.Center,
            };

            var checkBox = new CheckBox
            {
                IsChecked = value,
                VerticalAlignment = VerticalAlignment.Center,
            };

            checkBox.Checked += (s, e) => setter(true);
            checkBox.Unchecked += (s, e) => setter(false);

            row.Children.Add(labelBlock);
            row.Children.Add(checkBox);

            PropertiesPanel.Children.Add(row);
        }

        private void SaveProject_Click(object sender, RoutedEventArgs e)
        {
            var saveDialog = new Microsoft.Win32.SaveFileDialog
            {
                Filter = "Zamar Project (*.zproj)|*.zproj",
                DefaultExt = ".zproj",
            };

            if (saveDialog.ShowDialog() == true)
            {
                currentProject.SaveToFile(saveDialog.FileName);
                MessageBox.Show("Project saved successfully!");
            }
        }

        private void LoadProject_Click(object sender, RoutedEventArgs e)
        {
            var openDialog = new Microsoft.Win32.OpenFileDialog
            {
                Filter = "Zamar Project (*.zproj)|*.zproj",
                DefaultExt = ".zproj",
            };

            if (openDialog.ShowDialog() == true)
            {
                currentProject = GameProject.LoadFromFile(openDialog.FileName);
                UpdatePartsList();
                UpdateScriptsList();
                MessageBox.Show("Project loaded successfully!");
            }
        }

        private void PublishProject_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show($"Publishing '{currentProject.Name}'...", "Publish Game");
            // Call Zamar API to publish
        }

        private void PlayTest_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Starting play test...", "Test Play");
            // Launch test server with current game
        }
    }
}
