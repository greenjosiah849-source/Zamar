using System;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Xml.Linq;
using System.IO;

namespace ZamarStudio.ViewModels
{
    public class Part
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Type { get; set; } // "Block", "Wedge", "Sphere", "Cylinder"
        public Vector3D Position { get; set; }
        public Vector3D Size { get; set; }
        public Vector3D Rotation { get; set; }
        public string Material { get; set; } // "Plastic", "Wood", "Metal", "Brick"
        public string Color { get; set; }
        public bool Anchored { get; set; }
        public bool CanCollide { get; set; }
        public decimal Density { get; set; }

        public Part()
        {
            Id = Guid.NewGuid().ToString().Substring(0, 8);
            Position = new Vector3D { X = 0, Y = 5, Z = 0 };
            Size = new Vector3D { X = 2, Y = 2, Z = 2 };
            Rotation = new Vector3D { X = 0, Y = 0, Z = 0 };
            Color = "255,255,255";
            Anchored = false;
            CanCollide = true;
            Density = 1.0m;
        }
    }

    public class Vector3D
    {
        public decimal X { get; set; }
        public decimal Y { get; set; }
        public decimal Z { get; set; }

        public override string ToString() => $"{X}, {Y}, {Z}";
    }

    public class GameScript
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Language { get; set; } // "Lua" or "LuaU"
        public string Code { get; set; }
        public string Type { get; set; } // "Server", "Client", "LocalScript", "Module"
        public bool Disabled { get; set; }

        public GameScript()
        {
            Id = Guid.NewGuid().ToString().Substring(0, 8);
            Language = "Lua";
            Code = "-- Write your script here\nprint('Hello from Zamar!')";
            Disabled = false;
        }
    }

    public class GameEnvironment
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string TerrainMaterial { get; set; }
        public Vector3D AmbientLight { get; set; }
        public decimal Gravity { get; set; }
        public string SkyColor { get; set; }
        public bool HasWater { get; set; }
        public decimal WaterLevel { get; set; }

        public GameEnvironment()
        {
            Id = Guid.NewGuid().ToString().Substring(0, 8);
            Name = "Default Environment";
            AmbientLight = new Vector3D { X = 0.5m, Y = 0.5m, Z = 0.5m };
            Gravity = 9.81m;
            SkyColor = "100,149,237";
            HasWater = false;
            WaterLevel = -10;
        }
    }

    public class GameProject
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public ObservableCollection<Part> Parts { get; set; }
        public ObservableCollection<GameScript> Scripts { get; set; }
        public GameEnvironment Environment { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int Version { get; set; }

        public GameProject()
        {
            Id = Guid.NewGuid().ToString();
            Parts = new ObservableCollection<Part>();
            Scripts = new ObservableCollection<GameScript>();
            Environment = new GameEnvironment();
            CreatedAt = DateTime.Now;
            UpdatedAt = DateTime.Now;
            Version = 1;
        }

        public void SaveToFile(string path)
        {
            var doc = new XDocument(
                new XElement("Game",
                    new XAttribute("id", Id),
                    new XAttribute("name", Name),
                    new XAttribute("version", Version),
                    new XElement("Description", Description ?? ""),
                    new XElement("Environment",
                        new XAttribute("gravity", Environment.Gravity),
                        new XElement("AmbientLight", Environment.AmbientLight.ToString()),
                        new XElement("SkyColor", Environment.SkyColor),
                        new XElement("HasWater", Environment.HasWater),
                        new XElement("WaterLevel", Environment.WaterLevel)
                    ),
                    new XElement("Parts",
                        Parts.Select(p => new XElement("Part",
                            new XAttribute("id", p.Id),
                            new XAttribute("name", p.Name),
                            new XAttribute("type", p.Type),
                            new XAttribute("anchored", p.Anchored),
                            new XAttribute("canCollide", p.CanCollide),
                            new XElement("Position", p.Position.ToString()),
                            new XElement("Size", p.Size.ToString()),
                            new XElement("Rotation", p.Rotation.ToString()),
                            new XElement("Material", p.Material),
                            new XElement("Color", p.Color)
                        ))
                    ),
                    new XElement("Scripts",
                        Scripts.Select(s => new XElement("Script",
                            new XAttribute("id", s.Id),
                            new XAttribute("name", s.Name),
                            new XAttribute("type", s.Type),
                            new XAttribute("language", s.Language),
                            new XAttribute("disabled", s.Disabled),
                            new XCData(s.Code)
                        ))
                    )
                )
            );

            doc.Save(path);
            UpdatedAt = DateTime.Now;
        }

        public static GameProject LoadFromFile(string path)
        {
            var doc = XDocument.Load(path);
            var root = doc.Root;

            var project = new GameProject
            {
                Id = root.Attribute("id")?.Value ?? Guid.NewGuid().ToString(),
                Name = root.Attribute("name")?.Value ?? "Untitled",
                Version = int.Parse(root.Attribute("version")?.Value ?? "1"),
                Description = root.Element("Description")?.Value ?? "",
            };

            // Load environment
            var envElem = root.Element("Environment");
            if (envElem != null)
            {
                project.Environment.Gravity = decimal.Parse(envElem.Attribute("gravity")?.Value ?? "9.81");
                project.Environment.SkyColor = envElem.Element("SkyColor")?.Value ?? "100,149,237";
                project.Environment.HasWater = bool.Parse(envElem.Element("HasWater")?.Value ?? "false");
            }

            // Load parts
            var partsElem = root.Element("Parts");
            if (partsElem != null)
            {
                foreach (var partElem in partsElem.Elements("Part"))
                {
                    var part = new Part
                    {
                        Id = partElem.Attribute("id")?.Value ?? Guid.NewGuid().ToString().Substring(0, 8),
                        Name = partElem.Attribute("name")?.Value ?? "Part",
                        Type = partElem.Attribute("type")?.Value ?? "Block",
                        Anchored = bool.Parse(partElem.Attribute("anchored")?.Value ?? "false"),
                        CanCollide = bool.Parse(partElem.Attribute("canCollide")?.Value ?? "true"),
                        Material = partElem.Element("Material")?.Value ?? "Plastic",
                        Color = partElem.Element("Color")?.Value ?? "255,255,255",
                    };

                    // Parse position
                    var posStr = partElem.Element("Position")?.Value;
                    if (!string.IsNullOrEmpty(posStr))
                    {
                        var coords = posStr.Split(',');
                        if (coords.Length == 3)
                        {
                            part.Position = new Vector3D
                            {
                                X = decimal.Parse(coords[0]),
                                Y = decimal.Parse(coords[1]),
                                Z = decimal.Parse(coords[2]),
                            };
                        }
                    }

                    // Parse size
                    var sizeStr = partElem.Element("Size")?.Value;
                    if (!string.IsNullOrEmpty(sizeStr))
                    {
                        var coords = sizeStr.Split(',');
                        if (coords.Length == 3)
                        {
                            part.Size = new Vector3D
                            {
                                X = decimal.Parse(coords[0]),
                                Y = decimal.Parse(coords[1]),
                                Z = decimal.Parse(coords[2]),
                            };
                        }
                    }

                    project.Parts.Add(part);
                }
            }

            // Load scripts
            var scriptsElem = root.Element("Scripts");
            if (scriptsElem != null)
            {
                foreach (var scriptElem in scriptsElem.Elements("Script"))
                {
                    var script = new GameScript
                    {
                        Id = scriptElem.Attribute("id")?.Value ?? Guid.NewGuid().ToString().Substring(0, 8),
                        Name = scriptElem.Attribute("name")?.Value ?? "Script",
                        Type = scriptElem.Attribute("type")?.Value ?? "Server",
                        Language = scriptElem.Attribute("language")?.Value ?? "Lua",
                        Disabled = bool.Parse(scriptElem.Attribute("disabled")?.Value ?? "false"),
                        Code = scriptElem.Value ?? "",
                    };

                    project.Scripts.Add(script);
                }
            }

            return project;
        }
    }
}
