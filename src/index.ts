/* Author Dillon Gillespie
 * This is the final project for Dr. Kopper's CSC 495 VR class. 
 * The project is meant to give the user and experience in a shooting range environment.
 * As is stands the user has access to 3 weapons, with a 4th slot availible.
 * The user can also cylce between different maps and randomize the location of the targets.
 * 
 * When a weapon is out of ammo, pulling the right hand trigger button will cause it to load with 
 * the appropriate amount of ammo. If the trigger is pulled again with ammo the weapon will fire. 
 * 
 * On the user's left forearm appears the UI for interacting with the environment,  when
 * a weapon is drawn the UI will hide itself. To show the UI again the user must put away
 * their weapon with the right hand squeeze button.
 */

// Main Imports  
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Axis, Quaternion } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Sound } from "@babylonjs/core/Audio/sound"
import { AssetsManager } from "@babylonjs/core/Misc/assetsManager"
import { Logger } from "@babylonjs/core/Misc/logger";
import "@babylonjs/loaders/OBJ";
import { GUI3DManager } from "@babylonjs/gui/3D/gui3DManager";
import { HolographicButton } from "@babylonjs/gui/3D/controls/holographicButton";
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock";

// Physics
import * as Cannon from "cannon"
import { CannonJSPlugin } from "@babylonjs/core/Physics/Plugins/cannonJSPlugin";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import "@babylonjs/core/Physics/physicsEngineComponent";

// MeshBuilder
import {MeshBuilder} from  "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

// Side effects
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/core/Helpers/sceneHelpers";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AbstractMesh, HemisphericLight, int, PointerEventTypes, Ray, SceneLoader, Texture, TransformNode, WebXRControllerComponent } from "@babylonjs/core";

// Others
import "@babylonjs/inspector";
import { TextBlockPropertyGridComponent } from "@babylonjs/inspector/tabs/propertyGrids/gui/textBlockPropertyGridComponent";
import { AdvancedDynamicTextureTreeItemComponent } from "@babylonjs/inspector/components/sceneExplorer/entities/gui/advancedDynamicTextureTreeItemComponent";
import { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { RadioButtonPropertyGridComponent } from "@babylonjs/inspector/tabs/propertyGrids/gui/radioButtonPropertyGridComponent";
import { Button } from "@babylonjs/inspector/components/Button";
import { meshUboDeclaration } from "@babylonjs/core/Shaders/ShadersInclude/meshUboDeclaration";


//Sets the locomotion mode
enum LocomotionMode 
{
    viewDirected
}

//Allows the cycling of the weapons
enum UI 
{
    closed,
    weapons,
    maps,
    targets
}

//Cycles the level
enum Level
{
    mountain, 
    volcanoe,
    city,
    location4

}

enum Weapon
{
    disabled, 
    bow,
    crossbow,
    gun, 
    weapon4
}

enum Bow 
{
    unloaded,
    loaded
}
enum CrossBow 
{
    unloaded,
    loaded
}
enum Gun 
{
    unloaded,
    loaded
}


/******* Start of the Game class ******/ 
class Game 
{ 
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    //Web XRCamera and controllers are added
    private xrCamera: WebXRCamera | null; 
    private leftController: WebXRInputSource | null;
    private rightController: WebXRInputSource | null;

    //The different enum modes are added some with their respective roots
    private locomotionMode: LocomotionMode;
    private uiMode: UI;
    private weaponMode: Weapon;
    private levelMode: Level;
    public levelRoot;

    //ButtonRoot and it's children added
    public buttonRoot;
    public weaponRoot;
    public mapRoot;
    public targetRoot;

    //Bow flags added
    private bowMode: Bow;
    private bowReload: Sound | null;
    private bowFire: Sound | null;

    //Crossbow flags added
    private crossbowMode: CrossBow;
    private crossbowReload: Sound | null;
    private crossbowFire: Sound | null;

    //Revolver flags added
    private gunMode: Gun;
    private gunReload: Sound | null;
    private gunFire: Sound | null;
    private gunAmmo: int | null;

    //Placeholder effect
    private noEff: Sound | null;
    
    //Ambient light for universal usage 
    private ambLight: HemisphericLight;

    //Skybox for universal usage
    private skyBox: Mesh | null;
    private skyBoxMat: StandardMaterial | null;

    //Constructors
    constructor()
    {
        // Get the canvas element 
        this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        this.engine = new Engine(this.canvas, true); 

        // Creates a basic Babylon Scene object
        this.scene = new Scene(this.engine);   

        //Sets up the movement
        this.locomotionMode = LocomotionMode.viewDirected;

        //Sets the modes to their default states
        this.uiMode = UI.closed;
        this.weaponMode = Weapon.disabled;
        this.levelMode = Level.mountain;
        this.levelRoot = new TransformNode("rootNode", this.scene);
        this.bowMode = Bow.unloaded;
        this.crossbowMode = CrossBow.unloaded;
        this.gunMode = Gun.unloaded;

        //ButtonRoot and it's children roots
        this.buttonRoot = new TransformNode("rootNode", this.scene);
        this.weaponRoot = new TransformNode("rootNode", this.scene);
        this.weaponRoot.parent = this.buttonRoot;
        this.mapRoot = new TransformNode("rootNode", this.scene);
        this.mapRoot.parent = this.buttonRoot;
        this.targetRoot = new TransformNode("rootNode", this.scene);
        this.targetRoot.parent = this.buttonRoot;

        //Sets the XR controlls to null
        this.xrCamera = null;
        this.leftController = null;
        this.rightController = null;

        //Weapon null states
        this.bowReload = null;
        this.bowFire = null;
        //-----------------------
        this.crossbowReload = null;
        this.crossbowFire = null;
        //----------------------
        this.gunReload = null;
        this.gunFire = null;
        this.gunAmmo = 0;

        //placeholder sound
        this.noEff = null;

        //Set up the ambient light with it's intensity and default colour
        this.ambLight = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        this.ambLight.intensity = .5;
        this.ambLight.diffuse = new Color3(1, 1, .8);

        //Sets the initial skybox
        this.skyBox = MeshBuilder.CreateBox("Sky", {size: 350}, this.scene);
        this.skyBoxMat = new StandardMaterial("skyBox", this.scene);
        this.skyBoxMat.diffuseColor = new Color3(2, 3, 5);
        this.skyBoxMat.backFaceCulling = false;
        this.skyBox.material = this.skyBoxMat;
    }

    start() : void 
    {
        
        // Create the scene and then execute this function afterwards
        this.createScene().then(() => {
            // Register a render loop to repeatedly render the scene
            this.engine.runRenderLoop(() => {
                this.update();
                this.scene.render();
            });

            // Watch for browser/canvas resize events
            window.addEventListener("resize", () => { 
                this.engine.resize();
            });
        });
    }

    private async createScene() 
    {
        // This creates and positions a first-person camera (non-mesh)
        var camera = new UniversalCamera("camera1", new Vector3(0, 1.6, 0), this.scene);
        camera.fov = 90 * Math.PI / 180;

        // This attaches the camera to the canvas
        camera.attachControl(this.canvas, true);
        
        //set up the camera hitbox
        camera.ellipsoid = new Vector3(1.48, 1.48, 1.48);
        camera.ellipsoidOffset.y += .7;
        //enables collisions in the scene
        this.scene.collisionsEnabled = true;
        //enables camera hitboxes
        camera.checkCollisions = true;

        this.scene.enablePhysics(new Vector3(0, 0, 0), new CannonJSPlugin(undefined, undefined, Cannon));

        var pointLight = new PointLight("pointLight", new Vector3(0, 3.5, 0), this.scene);
        pointLight.intensity = 1.0;
        pointLight.diffuse = new Color3(.25, .25, .25);

        // Creates a default skybox
        let environment = this.scene.createDefaultEnvironment({
            skyboxSize: 750,
            skyboxColor: Color3.Teal()
        });

        //Ground and play area
        var ground = MeshBuilder.CreateBox("ground", {width: 10, height: 0.1, depth: 10}, this.scene);
        ground.position.y = 0;
        ground.checkCollisions = true;
        var ceiling = MeshBuilder.CreateBox("ground", {width: 10, height: 0.1, depth: 10}, this.scene);
        ceiling.position.y = 4;
        ceiling.checkCollisions = true;

        var groundMat = new StandardMaterial("groundMat", this.scene);
        groundMat.diffuseColor = new Color3(.9, .9, .9);
        ground.material = groundMat;
        ceiling.material = groundMat;
        var wall1 = MeshBuilder.CreateBox("ground", {width: .5, height: 4, depth: 10}, this.scene);
        wall1.position.x = -4.75;
        wall1.position.y = 2;
        wall1.material = groundMat;
        wall1.checkCollisions = true;
        var wall2 = MeshBuilder.CreateBox("ground", {width: .5, height: 4, depth: 10}, this.scene);
        wall2.position.x = 4.75;
        wall2.position.y = 2;
        wall2.material = groundMat;
        wall2.checkCollisions = true;
        var wall3 = MeshBuilder.CreateBox("ground", {width: 10, height: 4, depth: .5}, this.scene);
        wall3.position.z = -4.75;
        wall3.position.y = 2;
        wall3.material = groundMat;
        wall3.checkCollisions = true;
        var wall4 = MeshBuilder.CreateBox("ground", {width: 10, height: 1, depth: .5}, this.scene);
        wall4.position.z = 4.75;
        wall4.position.y = 0.5;
        wall4.material = groundMat;
        wall4.checkCollisions = true;

        //Barrier at 45 degree angles in the range
        var barrier1 = MeshBuilder.CreateBox("ground", {width: .5, height: 20, depth: 40}, this.scene);
        barrier1.position = new Vector3(19, 0, 19)
        barrier1.rotation = new Vector3(0*Math.PI/180, 45*Math.PI/180, 0*Math.PI/180); 
        barrier1.material = groundMat;
        var barrier2 = MeshBuilder.CreateBox("ground", {width: .5, height: 20, depth: 40}, this.scene);
        barrier2.position = new Vector3(-19, 0, 19)
        barrier2.rotation = new Vector3(0*Math.PI/180, -45*Math.PI/180, 0*Math.PI/180); 
        barrier2.material = groundMat;
        // Creates the XR experience helper
        const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

        // Disable teleportation 
        xrHelper.teleportation.dispose();

        // Assign the xrCamera to a member variable
        this.xrCamera = xrHelper.baseExperience.camera;
        this.buttonRoot.position = new Vector3(-0.1, -0.0, -0.25);
        this.buttonRoot.scaling = new Vector3(0.125, 0.125, 0.125)
        this.buttonRoot.rotation = new Vector3(30*Math.PI/180, 290*Math.PI/180, -10*Math.PI/180)
        this.buttonRoot.setEnabled(false);

        // Assigns the controllers
        xrHelper.input.onControllerAddedObservable.add((inputSource) =>
        {
            if(inputSource.uniqueId.endsWith("left")) 
            {
                //if this is true the controller is assigned as the left controller
                this.leftController = inputSource;
                this.buttonRoot.parent = this.leftController!.pointer;
                }else
            {
                //if this is true the controller is assigned as the right controller
                this.rightController = inputSource;

                //Weapons are added to the right hand
                SceneLoader.ImportMesh("", "./assets/models/", "crossbow.glb", this.scene, 
                (meshes)=>{
                    meshes[0].parent = inputSource.pointer;
                    meshes[0].name = "crossbow";
                    meshes[0].scaling = new Vector3(.2, .2, .2);
                    meshes[0].position = new Vector3(0, .03, -.2);
                    meshes[0].rotation = new Vector3(180*Math.PI/180, 90*Math.PI/180, 90*Math.PI/180); 
                    meshes[0].checkCollisions = false;  
                });
                SceneLoader.ImportMesh("", "./assets/models/", "bow.glb", this.scene, 
                (meshes)=>{
                    meshes[0].parent = inputSource.pointer;
                    meshes[0].name = "bow";
                    meshes[0].scaling = new Vector3(.5, .5, .5);
                    meshes[0].position = new Vector3(0, 0.0, -.13);
                    meshes[0].rotation = new Vector3(0*Math.PI/180, 0*Math.PI/180, 90*Math.PI/180);   
                    meshes[0].checkCollisions = false;  
                });
                SceneLoader.ImportMesh("", "./assets/models/", "revolver.glb", this.scene, 
                (meshes)=>{
                    meshes[0].parent = inputSource.pointer;
                    meshes[0].name = "revolver";
                    meshes[0].scaling = new Vector3(.6, .6, .6);
                    meshes[0].position = new Vector3(0, -.075, 0);
                    meshes[0].rotation = new Vector3(0*Math.PI/180, 90*Math.PI/180, 0*Math.PI/180);   
                    meshes[0].checkCollisions = false;  
                });

                //Placeholder for the 4th weapon
                var blankWeapon = MeshBuilder.CreateBox("NoItem", {size: .1}, this.scene);
                blankWeapon.parent = this.rightController!.pointer;
                blankWeapon.visibility = 0;


            }
        });

        var guimanager = new GUI3DManager(this.scene); 

        var buttonColor = new Color3(.25, .75, .8);

        //GUI Buttons
        //Gui buttons are created with a given size and stacked on top one another
        var guiWeapon = new HolographicButton("guiWeapon");
        guimanager.addControl(guiWeapon);
        guiWeapon.position = new Vector3(-.75, 1.25, 0);
        guiWeapon.scaling = new Vector3(0.5, 0.5, 0.5);
        guiWeapon.linkToTransformNode(this.buttonRoot);
        var guiMaps = new HolographicButton("guiMaps");
        guimanager.addControl(guiMaps);
        guiMaps.position = new Vector3(-.75, 0.75, 0);
        guiMaps.scaling = new Vector3(0.5, 0.5, 0.5);
        guiMaps.linkToTransformNode(this.buttonRoot);
        var guiTarget = new HolographicButton("guiTarget");
        guimanager.addControl(guiTarget);
        guiTarget.position = new Vector3(-.75, .25, 0);
        guiTarget.scaling = new Vector3(0.5, 0.5, 0.5);
        guiTarget.linkToTransformNode(this.buttonRoot);

        //Gui buttons are given their respective text
        var guiWeaponText = new TextBlock();
        guiWeaponText.text = "Weapons";
        guiWeaponText.color = "white";
        guiWeaponText.fontSize = 32;
        guiWeapon.content = guiWeaponText;
        var guiMapsText = new TextBlock();
        guiMapsText.text = "Maps";
        guiMapsText.color = "white";
        guiMapsText.fontSize = 32;
        guiMaps.content = guiMapsText;
        var guiTargetText = new TextBlock();
        guiTargetText.text = "Targets";
        guiTargetText.color = "white";
        guiTargetText.fontSize = 32;
        guiTarget.content = guiTargetText;

        //When a Gui button is selected the Gui will open the tab
        //If already open, th gui will close if selected again
        guiWeapon.onPointerDownObservable.add(()=>{
            if(this.uiMode != UI.weapons){
                this.uiMode = UI.weapons;
            }else{
                this.uiMode = UI.closed;
            }
        });
        guiMaps.onPointerDownObservable.add(()=>{
            if(this.uiMode != UI.maps){
                this.uiMode = UI.maps;
            }else{
                this.uiMode = UI.closed;
            }
        });
        guiTarget.onPointerDownObservable.add(()=>{
            if(this.uiMode != UI.targets){
                this.uiMode = UI.targets;
            }else{
                this.uiMode = UI.closed;
            }
        });

        //Weapon Buttons
        //Each button is created with a given size and location
        var weaponButton1 = new HolographicButton("weapon1");
        guimanager.addControl(weaponButton1);
        weaponButton1.position = new Vector3(-.125, 1.125, 0);
        weaponButton1.scaling = new Vector3(.75, 0.75, 0.75);
        weaponButton1.linkToTransformNode(this.weaponRoot);
        var weaponbutton2 = new HolographicButton("weapon2");
        guimanager.addControl(weaponbutton2);
        weaponbutton2.position = new Vector3(-.125, .375, 0);
        weaponbutton2.scaling = new Vector3(.75, 0.75, 0.75);
        weaponbutton2.linkToTransformNode(this.weaponRoot);
        var weaponbutton3 = new HolographicButton("weapon3");
        guimanager.addControl(weaponbutton3);
        weaponbutton3.position = new Vector3(.625, 1.125, 0);
        weaponbutton3.scaling = new Vector3(.75, 0.75, 0.75);
        weaponbutton3.linkToTransformNode(this.weaponRoot);
        var weaponbutton4 = new HolographicButton("weapon4");
        guimanager.addControl(weaponbutton4);
        weaponbutton4.position = new Vector3(.625, .375, 0);
        weaponbutton4.scaling = new Vector3(.75, 0.75, 0.75);
        weaponbutton4.linkToTransformNode(this.weaponRoot);

        //Each button is given their respective weapon name
        var weaponButton1Text = new TextBlock();
        weaponButton1Text.text = "Bow";
        weaponButton1Text.color = "white";
        weaponButton1Text.fontSize = 32;
        weaponButton1.content = weaponButton1Text;
        var weaponbutton2Text = new TextBlock();
        weaponbutton2Text.text = "Cross Bow";
        weaponbutton2Text.color = "white";
        weaponbutton2Text.fontSize = 32;
        weaponbutton2.content = weaponbutton2Text;
        var weaponbutton3Text = new TextBlock();
        weaponbutton3Text.text = "Gun";
        weaponbutton3Text.color = "white";
        weaponbutton3Text.fontSize = 32;
        weaponbutton3.content = weaponbutton3Text;
        var weaponbutton4Text = new TextBlock();
        weaponbutton4Text.text = "Weapon 4";
        weaponbutton4Text.color = "white";
        weaponbutton4Text.fontSize = 32;
        weaponbutton4.content = weaponbutton4Text;

        //Given the button pressed the weapon will be chosen accordingly
        weaponButton1.onPointerDownObservable.add(()=>{
            this.weaponMode = Weapon.bow;
        });
        weaponbutton2.onPointerDownObservable.add(()=>{
            this.weaponMode = Weapon.crossbow;
        });
        weaponbutton3.onPointerDownObservable.add(()=>{
            this.weaponMode = Weapon.gun;
        });
        weaponbutton4.onPointerDownObservable.add(()=>{
            this.weaponMode = Weapon.weapon4;
        });


        //Map Buttons
        //Map button is created with set size and location
        var mapButton1 = new HolographicButton("Map1");
        guimanager.addControl(mapButton1);
        mapButton1.position = new Vector3(-.125, 1.125, 0);
        mapButton1.scaling = new Vector3(.75, 0.75, 0.75);
        mapButton1.linkToTransformNode(this.mapRoot);
        var mapButton2 = new HolographicButton("Map2");
        guimanager.addControl(mapButton2);
        mapButton2.position = new Vector3(.625, 1.125, 0);
        mapButton2.scaling = new Vector3(.75, 0.75, 0.75);
        mapButton2.linkToTransformNode(this.mapRoot);
        var mapButton3 = new HolographicButton("Map3");
        guimanager.addControl(mapButton3);
        mapButton3.position = new Vector3(.25, .375, 0);
        mapButton3.scaling = new Vector3(.75, 0.75, 0.75);
        mapButton3.linkToTransformNode(this.mapRoot);

        //Each button is given their locations name
        var mapButton1Text = new TextBlock();
        mapButton1Text.text = "Mountain";
        mapButton1Text.color = "white";
        mapButton1Text.fontSize = 32;
        mapButton1.content = mapButton1Text;
        var mapButton2Text = new TextBlock();
        mapButton2Text.text = "Volcanoe";
        mapButton2Text.color = "white";
        mapButton2Text.fontSize = 32;
        mapButton2.content = mapButton2Text;
        var mapButton3Text = new TextBlock();
        mapButton3Text.text = "City";
        mapButton3Text.color = "white";
        mapButton3Text.fontSize = 32;
        mapButton3.content = mapButton3Text;        

        //Given the button pressed, the levelMode will cycle accordingly
        mapButton1.onPointerDownObservable.add(()=>{
            this.levelMode = Level.mountain;
        });
        mapButton2.onPointerDownObservable.add(()=>{
            this.levelMode = Level.volcanoe;
        });
        mapButton3.onPointerDownObservable.add(()=>{
            this.levelMode = Level.city;
        });

        //Target Buttons
        //There is currently only one button and it is set to the upper left quadrant of the UI
        //Other possible buttons could include resetting the score or raising or lowering 
        //difficulty by shrinking or growing the targets respectively
        var targetButton = new HolographicButton("targets");
        guimanager.addControl(targetButton);
        targetButton.position = new Vector3(-.125, 1.125, 0);
        targetButton.scaling = new Vector3(.75, 0.75, 0.75);
        targetButton.linkToTransformNode(this.targetRoot);

        //The button is given it's respective text
        var targetButtonText = new TextBlock();
        targetButtonText.text = "Randomize \nTargets";
        targetButtonText.color = "white";
        targetButtonText.fontSize = 32;
        targetButton.content = targetButtonText;

        //When the button is pressed it randomizes the locations of the targets
        //within certain parameters where each target remains at it's z coordinate
        targetButton.onPointerDownObservable.add(()=>{
            //### RANDOMIZE THE TARGETS ###//
            // this.noEff!.play();
            this.scene.getMeshByName("target1")!.position = new Vector3(Math.random() * (10 - 30) + 15, Math.random()* 4 + 1, 15);
            this.scene.getMeshByName("target2")!.position = new Vector3(Math.random() * (10 - 4) + 4, Math.random()* (17 - 14) + 14, 34);
            this.scene.getMeshByName("target3")!.position = new Vector3(Math.random() * (8 - 20) + 10, Math.random()* (11 - 9) + 9, 26);
            this.scene.getMeshByName("target4")!.position = new Vector3(Math.random() * (8 - 4) - 8, Math.random()* (20 - 18) + 18, 36);
            this.scene.getMeshByName("target5")!.position = new Vector3(Math.random() * (15 - 10) - 20, Math.random()* (10 - 8) + 8, 24);
            
        });

        //Targets are initialized and loaded into their default locations.
        SceneLoader.ImportMesh("", "./assets/models/", "target.glb", this.scene, 
        (meshes)=>{
            meshes[0].name = "target1";
            meshes[0].scaling = new Vector3(1, 1, 1);
            meshes[0].position = new Vector3(0, 4, 15);
            meshes[0].rotation = new Vector3(0*Math.PI/180, 90*Math.PI/180, 0*Math.PI/180);   
            meshes[0].checkCollisions = true;  
        });
        SceneLoader.ImportMesh("", "./assets/models/", "target.glb", this.scene, 
        (meshes)=>{
            meshes[0].name = "target2";
            meshes[0].scaling = new Vector3(1, 1, 1);
            meshes[0].position = new Vector3(10, 15, 40);
            meshes[0].rotation = new Vector3(0*Math.PI/180, 90*Math.PI/180, 0*Math.PI/180);   
            meshes[0].checkCollisions = true;  
        });
        SceneLoader.ImportMesh("", "./assets/models/", "target.glb", this.scene, 
        (meshes)=>{
            meshes[0].name = "target3";
            meshes[0].scaling = new Vector3(1, 1, 1);
            meshes[0].position = new Vector3(13, 10, 25);
            meshes[0].rotation = new Vector3(0*Math.PI/180, 90*Math.PI/180, 0*Math.PI/180);   
            meshes[0].checkCollisions = true;  
        });
        SceneLoader.ImportMesh("", "./assets/models/", "target.glb", this.scene, 
        (meshes)=>{
            meshes[0].name = "target4";
            meshes[0].scaling = new Vector3(1, 1, 1);
            meshes[0].position = new Vector3(-7.5, 19, 40);
            meshes[0].rotation = new Vector3(0*Math.PI/180, 90*Math.PI/180, 0*Math.PI/180);   
            meshes[0].checkCollisions = true;  
        });
        SceneLoader.ImportMesh("", "./assets/models/", "target.glb", this.scene, 
        (meshes)=>{
            meshes[0].name = "target5";
            meshes[0].scaling = new Vector3(1, 1, 1);
            meshes[0].position = new Vector3(-15, 6, 25);
            meshes[0].rotation = new Vector3(0*Math.PI/180, 90*Math.PI/180, 0*Math.PI/180);   
            meshes[0].checkCollisions = true;  
        });


        // The assets manager can be used to load multiple assets
        var assetsManager = new AssetsManager(this.scene);

        //The maps are initialized
        var terrain = assetsManager.addMeshTask("world", "", "Assets/Models/", "terrain.glb");
        var volcano = assetsManager.addMeshTask("world", "", "Assets/Models/", "volcano.glb");
        var city = assetsManager.addMeshTask("world", "", "Assets/Models/", "neon_city.glb");
        
        //world is given it's mesh and parameters
        terrain.onSuccess = (task) => {
            //loads the mountainous area
            terrain.loadedMeshes[0].name = "terrain";
            terrain.loadedMeshes[0].rotation = new Vector3(0, Math.PI/180, 0);
            terrain.loadedMeshes[0].position.x = 0;
            terrain.loadedMeshes[0].position.y = -2;
            terrain.loadedMeshes[0].position.z = 25;
            terrain.loadedMeshes[0].parent = this.levelRoot;
            //removes the trees clipping into the main area
            this.scene.getMeshByName("Object_98")!.visibility = 0;
            this.scene.getMeshByName("Object_99")!.visibility = 0;
            this.scene.getMeshByName("Object_101")!.visibility = 0;
            this.scene.getMeshByName("Object_102")!.visibility = 0;
        }
        volcano.onSuccess = (task) => {
            //loads the mountainous area
            volcano.loadedMeshes[0].name = "volcano";
            volcano.loadedMeshes[0].rotation = new Vector3(0, -45*Math.PI/180, 0);
            volcano.loadedMeshes[0].scaling = new Vector3(25, 25, 25);
            volcano.loadedMeshes[0].position.x = 100;
            volcano.loadedMeshes[0].position.y = -2;
            volcano.loadedMeshes[0].position.z = 35;
            volcano.loadedMeshes[0].parent = this.levelRoot;
        }
        city.onSuccess = (task) => {
            //loads the mountainous area
            city.loadedMeshes[0].name = "city";
            city.loadedMeshes[0].rotation = new Vector3(0, -135*Math.PI/180, 0);
            city.loadedMeshes[0].scaling = new Vector3(25, 25, 25);
            city.loadedMeshes[0].position.x = 250;
            city.loadedMeshes[0].position.y = -10;
            city.loadedMeshes[0].position.z = 50;
            city.loadedMeshes[0].parent = this.levelRoot;
        }


        //##### Sound Effects #####
        var BowReload = assetsManager.addBinaryFileTask("BReload", "assets/audio/bow_Reload.mp3");
        BowReload.onSuccess = (task) => {
            this.bowReload = new Sound("BReload", task.data, this.scene, null, {
                loop: false
            });
        }
        var BowFire = assetsManager.addBinaryFileTask("BFire", "assets/audio/bow_Fire.mp3");
        BowFire.onSuccess = (task) => {
            this.bowFire = new Sound("BFire", task.data, this.scene, null, {
                loop: false
            });
        }
        var CBReload = assetsManager.addBinaryFileTask("CBReload", "assets/audio/Crossbow_reload.mp3");
        CBReload.onSuccess = (task) => {
            this.crossbowReload = new Sound("CBReload", task.data, this.scene, null, {
                loop: false
            });
        }
        var CBFire = assetsManager.addBinaryFileTask("CBFire", "assets/audio/Crossbow_fire.mp3");
        CBFire.onSuccess = (task) => {
            this.crossbowFire = new Sound("CBFire", task.data, this.scene, null, {
                loop: false
            });
        }
        var RevReload = assetsManager.addBinaryFileTask("RevReload", "assets/audio/Revolver_reload.mp3");
        RevReload.onSuccess = (task) => {
            this.gunReload = new Sound("RevReload", task.data, this.scene, null, {
                loop: false,
                volume: .5
            });
        }
        var RevFire = assetsManager.addBinaryFileTask("RevFire", "assets/audio/Revolver_fire.mp3");
        RevFire.onSuccess = (task) => {
            this.gunFire = new Sound("RevFire", task.data, this.scene, null, {
                loop: false,
                volume: .5
            });
        }
        //This is a sound effect to test buttons, a sinple horn plays if a button works when tested
        var noSoundEff = assetsManager.addBinaryFileTask("noSoundEff", "assets/audio/placeholder.mp3");
        noSoundEff.onSuccess = (task) => {
            this.noEff = new Sound("noSoundEff", task.data, this.scene, null, {
                loop: false,
                volume: 1
            });
        }

        // This loads all the assets and displays a loading screen
        assetsManager.load();

        // This will execute when all assets are loaded
        assetsManager.onFinish = (tasks) => {

            // Show the debug layer
            this.scene.debugLayer.show();
        };  
    }

    // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {

        //Controller button presses are checked
        this.processControllerInput();

        //The XRCamera is positioned (tried getting a collision check to work)
        if(this.xrCamera){
            this.xrCamera.position.y = 1.75;
            this.xrCamera.ellipsoid = new Vector3(1.48, 1.48, 1.48);
            this.xrCamera.ellipsoidOffset.y += .7;
            this.xrCamera.checkCollisions = true;
        }

        //UI is checked for it's current mode
        //When closed the 3 main buttons return to their default state
        if(this.uiMode == UI.closed){
             this.buttonRoot.position = new Vector3(-.05, -0.02, -0.125);
             this.weaponRoot.setEnabled(false);
             this.mapRoot.setEnabled(false);
             this.targetRoot.setEnabled(false);
        }
        //When the weapons tab is opened the main menu buttons are shifted
        //and the 4 weapon tabs are displayed
        else if(this.uiMode == UI.weapons){
            this.buttonRoot.position = new Vector3(-0.1, -0.0, -0.25);
            this.weaponRoot.setEnabled(true);
            this.mapRoot.setEnabled(false);
            this.targetRoot.setEnabled(false);
        }
        //When the maps tab is opened the main menu buttons are shifted
        //and the 3 availible maps are shown
        else if(this.uiMode == UI.maps){
            this.buttonRoot.position = new Vector3(-0.1, -0.0, -0.25);
            this.weaponRoot.setEnabled(false);
            this.mapRoot.setEnabled(true);
            this.targetRoot.setEnabled(false);
        }
        //When the targets tab is opened the main menu buttons are shifted
        //and the button to randomize the targets is shown
        else if(this.uiMode == UI.targets){
            this.buttonRoot.position = new Vector3(-0.1, -0.0, -0.25);
            this.weaponRoot.setEnabled(false);
            this.mapRoot.setEnabled(false);
            this.targetRoot.setEnabled(true);
        }

        //Checks the current mode of the level and updates as needed
        if(this.levelMode == Level.mountain){
            
            //The level root is shifted to 0 to display the mountains
            this.levelRoot.position.x = 0;

            //The skybox is set to a normal blue
            this.skyBoxMat!.diffuseColor = new Color3(2, 3, 5);

            //The ambient light is changed to fit the scene
            this.ambLight.intensity = .5;
            this.ambLight.diffuse = new Color3(1, 1, .8);
        }else if(this.levelMode == Level.volcanoe){

            //The stage is shifted to left 100m to display the volcanoe
            this.levelRoot.position.x = -100;

            //The sky is set a crimson red to set the tone
            this.skyBoxMat!.diffuseColor = new Color3(.75, 0, 0);

            //The ambient light is changed to fit the scene
            this.ambLight.intensity = .25;
            this.ambLight.diffuse = new Color3(.75, 0, 0);

        }else if(this.levelMode == Level.city){

            //The stage is shifted 
            this.levelRoot.position.x = -250;

            //The sky is set to a midnight purple to reflect the glow of the city
            this.skyBoxMat!.diffuseColor = new Color3(.75, 0, .75);

            //The ambient light is changed to fit the scene
            this.ambLight.intensity = .05;
            this.ambLight.diffuse = new Color3(1.75, 0, 1.75);
            
        }

        //Checks the weapon mode and updates as needed
        if(this.weaponMode == Weapon.disabled){

            //The UI is set to be visible
            this.buttonRoot.setEnabled(true);

            //All weapons are set to be invisible
            if(this.scene.getMeshByName("bow_world_bow_0")) this.scene.getMeshByName("bow_world_bow_0")!.visibility = 0;
            if(this.scene.getMeshByName("Crossbow_Material_0")) this.scene.getMeshByName("Crossbow_Material_0")!.visibility = 0;
            if(this.scene.getMeshByName("Revolver_Low_Poly_lambert1_0")) this.scene.getMeshByName("Revolver_Low_Poly_lambert1_0")!.visibility = 0;
            if(this.scene.getMeshByName("NoItem")) this.scene.getMeshByName("NoItem")!.visibility = 0;
        }
        else if(this.weaponMode == Weapon.bow){

            //The UI is set to be invisible
            this.buttonRoot.setEnabled(false);
            this.weaponRoot.setEnabled(false);
            this.mapRoot.setEnabled(false);
            this.targetRoot.setEnabled(false);

            //THe bow is set to be visible
            if(this.scene.getMeshByName("bow_world_bow_0")) this.scene.getMeshByName("bow_world_bow_0")!.visibility = 1;
            if(this.scene.getMeshByName("Crossbow_Material_0")) this.scene.getMeshByName("Crossbow_Material_0")!.visibility = 0;
            if(this.scene.getMeshByName("Revolver_Low_Poly_lambert1_0")) this.scene.getMeshByName("Revolver_Low_Poly_lambert1_0")!.visibility = 0;
            if(this.scene.getMeshByName("NoItem")) this.scene.getMeshByName("NoItem")!.visibility = 0;
        }else if(this.weaponMode == Weapon.crossbow){

            //The UI is set to be invisible
            this.buttonRoot.setEnabled(false);
            this.weaponRoot.setEnabled(false);
            this.mapRoot.setEnabled(false);
            this.targetRoot.setEnabled(false);

            //THe crossbow is set to be visible
            if(this.scene.getMeshByName("bow_world_bow_0")) this.scene.getMeshByName("bow_world_bow_0")!.visibility = 0;
            if(this.scene.getMeshByName("Crossbow_Material_0")) this.scene.getMeshByName("Crossbow_Material_0")!.visibility = 1;
            if(this.scene.getMeshByName("Revolver_Low_Poly_lambert1_0")) this.scene.getMeshByName("Revolver_Low_Poly_lambert1_0")!.visibility = 0;
            if(this.scene.getMeshByName("NoItem")) this.scene.getMeshByName("NoItem")!.visibility = 0;
        }else if(this.weaponMode == Weapon.gun){

            //The UI is set to be invisible
            this.buttonRoot.setEnabled(false);
            this.weaponRoot.setEnabled(false);
            this.mapRoot.setEnabled(false);
            this.targetRoot.setEnabled(false);

            //THe gun is set to be visible
            if(this.scene.getMeshByName("bow_world_bow_0")) this.scene.getMeshByName("bow_world_bow_0")!.visibility = 0;
            if(this.scene.getMeshByName("Crossbow_Material_0")) this.scene.getMeshByName("Crossbow_Material_0")!.visibility = 0;
            if(this.scene.getMeshByName("Revolver_Low_Poly_lambert1_0")) this.scene.getMeshByName("Revolver_Low_Poly_lambert1_0")!.visibility = 1;
            if(this.scene.getMeshByName("NoItem")) this.scene.getMeshByName("NoItem")!.visibility = 0;
        }else if(this.weaponMode == Weapon.weapon4){

            //The UI is set to be invisible
            this.buttonRoot.setEnabled(false);
            this.weaponRoot.setEnabled(false);
            this.mapRoot.setEnabled(false);
            this.targetRoot.setEnabled(false);

            //THe 4th weapon is set to be visible
            if(this.scene.getMeshByName("bow_world_bow_0")) this.scene.getMeshByName("bow_world_bow_0")!.visibility = 0;
            if(this.scene.getMeshByName("Crossbow_Material_0")) this.scene.getMeshByName("Crossbow_Material_0")!.visibility = 0;
            if(this.scene.getMeshByName("Revolver_Low_Poly_lambert1_0")) this.scene.getMeshByName("Revolver_Low_Poly_lambert1_0")!.visibility = 0;
            if(this.scene.getMeshByName("NoItem")) this.scene.getMeshByName("NoItem")!.visibility = 1;
        }
    }

    //Checks controller inputs
    private processControllerInput()
    {
        this.onRightTrigger(this.rightController?.motionController?.getComponent("xr-standard-trigger"));
        this.onLeftTrigger(this.leftController?.motionController?.getComponent("xr-standard-trigger"));
        this.onRightSqueeze(this.rightController?.motionController?.getComponent("xr-standard-squeeze"));
        this.onLeftSqueeze(this.leftController?.motionController?.getComponent("xr-standard-squeeze"));
        this.onRightThumbstick(this.rightController?.motionController?.getComponent("xr-standard-thumbstick"));
    }

    //This is the squeeze button, assuming the mapping of xr-standard-squeeze is correct
    private onRightSqueeze(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                //disables the currently drawn weapon to allow for the user
                //to use the UI again
                this.weaponMode = Weapon.disabled;
                }
                Logger.Log("right squeeze pressed");
            }
            else
            {
                //Logger.Log("right squeeze released");

            }
        }  
    
    //Currently no functionality
    private onLeftSqueeze(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("left squeeze pressed");
            }
            else
            {
                Logger.Log("left squeeze released");

            }
        }  
    }
   
    //The main source to fire weapons and interact with the environment
    private onRightTrigger(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        { 
            //Checks if the trigger is pressed
            if(component?.pressed)
            {
                //Checks if the right controller exists
                //This is in place to prevent babylonjs from not loading when it suspects
                //a value may be null even when told the value cannot be null
                if(this.rightController?.pointer){

                    //If no weapon is selected
                    if(this.weaponMode == Weapon.disabled){
                        //This was to be used for the ray tracing part of the project
                        //But raytracing doesnt work on Button3D objects so the default
                        //Controller pointer is used.
                    }
                    
                    //If the weapon equiped is currently the bow.
                    if(this.weaponMode == Weapon.bow){

                        //Checks if the weapon is loaded, if it isn't it will play a sound and be loaded
                        if(this.bowMode == Bow.unloaded){

                            //The state of the bow is set to loaded for the next trigger pull
                            this.bowMode = Bow.loaded;

                            //The bow reloading sound is played
                            this.bowReload?.play();

                        //if loaded it can fire and switch back to being unloaded
                        }else if(this.bowMode == Bow.loaded){

                            //Bullet is created
                            let bullet = MeshBuilder.CreateSphere("bullet", {diameter: .03}, this.scene);
                            let bulletMat = new StandardMaterial("bulletMat", this.scene);
                            bulletMat.diffuseColor = Color3.White();
                            bullet.material = bulletMat;
                            bullet.position = this.rightController.pointer.position;

                            //Bullet is given physics and velocity in relation to the controller's pointed direction
                            bullet.physicsImpostor = new PhysicsImpostor(bullet, PhysicsImpostor.BoxImpostor, {mass: 1}, this.scene);
                            bullet.physicsImpostor.setLinearVelocity(new Vector3(0, 0, 0));
                            bullet.applyImpulse(new Vector3((this.rightController!.pointer.forward.x *(180*Math.PI/180)*2), (this.rightController!.pointer.forward.y *(180*Math.PI/180)*2), (this.rightController!.pointer.forward.z *(180*Math.PI/180)*2)), this.rightController!.pointer.forward);
                            
                            //The bow firing sound effect plays
                            this.bowFire?.play();

                            //The state of the bow is returned to being unloaded
                            this.bowMode = Bow.unloaded;
                        }
                    }    

                    //If the current weapon is the crossbow
                    if(this.weaponMode == Weapon.crossbow){

                        //If the crossbow is currently unloaded
                        if(this.crossbowMode == CrossBow.unloaded){

                            //Sets the crossbow to a loaded state
                            this.crossbowMode = CrossBow.loaded;

                            //Plays the reloading sound for the crossbow
                            this.crossbowReload?.play();

                        //If the crossbow is loaded
                        }else if(this.crossbowMode == CrossBow.loaded){

                            //Creates the projectile for the crossbow
                            let bullet = MeshBuilder.CreateSphere("bullet", {diameter: .03}, this.scene);
                            let bulletMat = new StandardMaterial("bulletMat", this.scene);
                            bulletMat.diffuseColor = Color3.White();
                            bullet.material = bulletMat;
                            bullet.position = this.rightController.pointer.position;

                            //Gives the projectile physics and velocity
                            bullet.physicsImpostor = new PhysicsImpostor(bullet, PhysicsImpostor.BoxImpostor, {mass: 1}, this.scene);
                            bullet.physicsImpostor.setLinearVelocity(new Vector3(0, 0, 0));
                            bullet.applyImpulse(new Vector3((this.rightController!.pointer.forward.x *(180*Math.PI/180))*3, (this.rightController!.pointer.forward.y *(180*Math.PI/180))*3, (this.rightController!.pointer.forward.z *(180*Math.PI/180))*3), this.rightController!.pointer.forward);
                            
                            //Plays the crossbow firing sound effect
                            this.crossbowFire?.play();

                            //Sets the crossbow to an unloaded state
                            this.crossbowMode = CrossBow.unloaded;
                        }
                    }    

                    //If the current weapon is the gun
                    if(this.weaponMode == Weapon.gun){

                        //If the gun is not loaded
                        if(this.gunMode == Gun.unloaded){

                            //Sets the gun to the loaded state
                            this.gunMode = Gun.loaded;
                            
                            //Gives the gun 6 shots
                            this.gunAmmo = 6;
                            
                            //plays the reload sound effect
                            this.gunReload?.play();

                        //If the gun is currently loaded and has ammo left
                        }else if(this.gunMode == Gun.loaded){
                            //If the gun is on it's last bullet
                            if(this.gunAmmo == 1){

                                //Create the bullet
                                this.gunAmmo -= 1;
                                let bullet = MeshBuilder.CreateSphere("bullet", {diameter: .03}, this.scene);
                                let bulletMat = new StandardMaterial("bulletMat", this.scene);
                                bulletMat.diffuseColor = Color3.White();
                                bullet.material = bulletMat;
                                bullet.position.x = this.rightController.pointer.position.x;
                                bullet.position.y = this.rightController.pointer.position.y+0.07;
                                bullet.position.z = this.rightController.pointer.position.z;
                                
                                //Give the bullet physics and velocity
                                bullet.physicsImpostor = new PhysicsImpostor(bullet, PhysicsImpostor.BoxImpostor, {mass: 1}, this.scene);
                                bullet.physicsImpostor.setLinearVelocity(new Vector3(0, 0, 0));
                                bullet.applyImpulse(new Vector3((this.rightController!.pointer.forward.x *(180*Math.PI/180))*3, (this.rightController!.pointer.forward.y *(180*Math.PI/180))*3, (this.rightController!.pointer.forward.z *(180*Math.PI/180))*3), this.rightController!.pointer.forward);
                                
                                //Play the firing sound effect
                                this.gunFire?.play();

                                //Set the gun to the unloaded state
                                this.gunMode = Gun.unloaded;

                            //if the gun has more than 1 bullet
                            //Same process except the gun is not returned to the unloaded state
                            }else{
                                this.gunAmmo! -= 1;
                                let bullet = MeshBuilder.CreateSphere("bullet", {diameter: .03}, this.scene);
                                let bulletMat = new StandardMaterial("bulletMat", this.scene);
                                bulletMat.diffuseColor = Color3.White();
                                bullet.material = bulletMat;
                                bullet.position.x = this.rightController.pointer.position.x;
                                bullet.position.y = this.rightController.pointer.position.y+0.07;
                                bullet.position.z = this.rightController.pointer.position.z;
                                bullet.physicsImpostor = new PhysicsImpostor(bullet, PhysicsImpostor.BoxImpostor, {mass: 1}, this.scene);
                                bullet.physicsImpostor.setLinearVelocity(new Vector3(0, 0, 0));
                                bullet.applyImpulse(new Vector3((this.rightController!.pointer.forward.x *(180*Math.PI/180))*3, (this.rightController!.pointer.forward.y *(180*Math.PI/180))*3, (this.rightController!.pointer.forward.z *(180*Math.PI/180))*3), this.rightController!.pointer.forward);
                                this.gunFire?.play();
                            }
                        }

                        //Here is where weapon 4 should go
                        //if it is not completed then an untextured cube will be put in it's place
                    }    
                }
                //testing purposes
                Logger.Log("right trigger pressed");
                
            }
            else
            {
                Logger.Log("right trigger released");
            }
        }  
    }

    //Currently not in use
    private onLeftTrigger(component?: WebXRControllerComponent)
    {  
        if(component?.changes.pressed)
        { 
            if(component?.pressed)
            {
                Logger.Log("left trigger pressed");
            }
            else
            {
                Logger.Log("left trigger released");
            }
        }  
    }

    //Used to move the player around
    private onRightThumbstick(component?: WebXRControllerComponent)
    {
        if(component?.changes.axes)
        {
            //Movement is head-facing based
            var directionVector = 
            (this.locomotionMode == LocomotionMode.viewDirected ? 
                this.xrCamera!.getDirection(Axis.Z) :
                this.rightController!.pointer.forward);

                
            var moveDistance = -component.axes.y * (this.engine.getDeltaTime() / 1000) * 3;

            var turnAngle = component.axes.x * (this.engine.getDeltaTime() / 1000) * 60;

            //Movement
            this.xrCamera!.position.addInPlace(directionVector.scale(moveDistance)).x;
            this.xrCamera!.position.y = 1.75;
            this.xrCamera!.position.addInPlace(directionVector.scale(moveDistance)).z;

            //Turning
            var cameraRotation = Quaternion.FromEulerAngles(0, turnAngle * Math.PI / 180, 0);
            this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
        }
    }
}

/******* End of the Game class ******/   

// start the game
var game = new Game();
game.start();





//################//
//## SCRAP CODE ##//
//################//


//## OLD WEAPON CYCLING
    // if(this.weaponMode == Weapon.disabled){
    //     this.weaponMode = Weapon.bow;
    //     this.scene.getMeshByName("bow_world_bow_0")!.visibility = 1;

    // }else if(this.weaponMode == Weapon.bow){
    //     this.weaponMode = Weapon.crossbow;
    //     this.scene.getMeshByName("bow_world_bow_0")!.visibility = 0;
    //     this.scene.getMeshByName("Crossbow_Material_0")!.visibility = 1;
    // }else if(this.weaponMode == Weapon.crossbow){
    //     this.weaponMode = Weapon.gun;
    //     this.scene.getMeshByName("Crossbow_Material_0")!.visibility = 0;
    //     this.scene.getMeshByName("Revolver_Low_Poly_lambert1_0")!.visibility = 0;

    // }else if(this.weaponMode == Weapon.gun){
    //     this.weaponMode = Weapon.weapon4;
    //     this.scene.getMeshByName("NoItem")!.visibility = 1;

    // }else{
    //     this.weaponMode = Weapon.disabled
    //     this.scene.getMeshByName("NoItem")!.visibility = 0;
    // }

    //## OLD MAP CYCLING

    
                // //Checks level and cycles on press
                // if(this.levelMode == Level.mountain){
                //     this.levelMode = Level.volcanoe;

                // }else if(this.levelMode == Level.volcanoe){
                //     this.levelMode = Level.mountain;
                // }


//###Lets bullets be fired and applies the direction of the current controller with velocity
// let bullet = MeshBuilder.CreateSphere("bullet", {diameter: .1}, this.scene);
// let bulletMat = new StandardMaterial("bulletMat", this.scene);
// bulletMat.diffuseColor = Color3.Blue();
// bullet.material = bulletMat;
// bullet.position = this.rightController.pointer.position;
// bullet.physicsImpostor = new PhysicsImpostor(bullet, PhysicsImpostor.BoxImpostor, {mass: 1}, this.scene);
// bullet.physicsImpostor.setLinearVelocity(new Vector3(0, 0, 0));
// bullet.applyImpulse(new Vector3(this.rightController!.pointer.forward.x*3, this.rightController!.pointer.forward.y*3, this.rightController!.pointer.forward.z*3), this.rightController!.pointer.forward);

//###Creates a laser in the scene

// var laserPoints = [];
// laserPoints.push(Vector3.Zero());
// laserPoints.push(new Vector3(0, 0, 20));
// this.laserPointer = MeshBuilder.CreateLines("laser", {points: laserPoints});
// this.laserPointer.color = Color3.Red();
// this.laserPointer.alpha = 0.5;
// this.laserPointer.visibility = 0;
// this.laserPointer.isPickable = false;