'use strict';

// import * as handTrack from 'handtrackjs';
let dark_gray = 'rgba(84, 84, 84, 0.3)'
let full_gray = 'rgba(84, 84, 84, 0.8)'

let drawingColors = ['rgb(255, 255, 255)', 'rgb(113, 253, 145)', 'rgb(107, 181, 254)', 'rgb(225, 143, 255)']
let dimDrawingColors = ['rgba(255, 255, 255, 0.4)', 'rgba(113, 253, 145, 0.4)', 'rgba(107, 181, 254, 0.4)', 'rgba(225, 143, 255, 0.4)']

let selectedColor = drawingColors[3]; 


let imgindex = 1;
let isVideo = false;
let model = null;

const video = document.getElementById('webcam-video');
const canvas = document.getElementById('webcam-canvas');
const context = canvas.getContext('2d');

// states 
var modelReady = false; 

const WelcomeState = 0; 
const InstructionState = 1; 
const DrawState = 2; 
const MenuState = 3; 
var state = WelcomeState; 

var canChangeMenu = true; 
var tracing = false; 

const modelParams = {
  flipHorizontal: true, // flip e.g for video
  maxNumBoxes: 20, // maximum number of boxes to detect
  iouThreshold: 0.5, // ioU threshold for non-max suppression
  scoreThreshold: 0.6, // confidence threshold for predictions.
};

handTrack.load(modelParams).then((lmodel) => {
  model = lmodel;
  modelReady = true; 
  startVideo(); 
  // runDetectionImage(handimg);
});

function startVideo() {
  handTrack.startVideo(video).then(function (status) {
    if (status) {
      isVideo = true;
      // runDetection();
      // startDrawing(); 
    } 
  });
}

function runDetection() {
  model.detect(video).then((predictions) => {
    usePredictions(predictions); 
    model.renderPredictions(predictions, canvas, context, video);
    if (isVideo) {
      requestAnimationFrame(runDetection);
    }
  });
}

// visual stuff below
const videoDimensions = [600, 400]; 
let cWidth = 100; 
let cHeight = 100; 

let foundFaces = []
let fists = []
let palms = []
let pointers = []

let last_centroid = []
let centroid = []
let brush_size = 1
let drawingPath = []
let drawingPathHistory = []

let facePositionFactor = 0.5
let brushFactor = 0.05

function usePredictions(predictions){ 
  let tempFoundFaces = []
  fists = []
  palms = []
  pointers = []
  predictions.forEach(function(pred){
    if(pred.label == 'face'){
      tempFoundFaces.push(convertBBox(pred.bbox))
    }
    if(pred.label == 'closed'){
      fists.push(convertBBox(pred.bbox))
    }
    if(pred.label == 'open'){
      palms.push(convertBBox(pred.bbox))
    }
    if(pred.label == 'point'){
      pointers.push(convertBBox(pred.bbox))
    }
  })
  // if(tempFoundFaces.length > 0){
  // handleFaceFeed(tempFoundFaces)
  // }

  // sort for detection later 
  if(fists.length > 1){
    fists.sort((a, b) => (a[0] > b[0]) ? 1 : -1); 
  }
  if(palms.length > 1){
    palms.sort((a, b) => (a[0] > b[0]) ? 1 : -1); 
  }
  if(pointers.length > 1){
    pointers.sort((a, b) => (a[0] > b[0]) ? 1 : -1); 
  }
  if(pointers.length >= 2 && state == DrawState && canChangeMenu){
    state = MenuState; 
    canChangeMenu = false; 
  }
  else if(pointers.length >= 2 && state == MenuState && canChangeMenu){
    state = DrawState
    canChangeMenu = false; 
  }
  if(pointers.length < 2){
    canChangeMenu = true; 
  }
  if(state == InstructionState && palms.length >= 2){
    state = DrawState; 
  }

  if(state != MenuState){
    handleFaceFeed(tempFoundFaces)
  }
}

// calculate the centroid 
// calculate brush size
// update history 
function handleFaceFeed(faces){
  if(faces.length < numPlayers){
    foundFaces = faces
    allPlayersFound = false
    return
  }
  allPlayersFound = true

  let new_centroid = [0, 0]; 
  let new_brush_size = 0; 
  faces.forEach(function(f){
    // brush stuff 
    new_centroid[0] = new_centroid[0] + f[0]
    new_centroid[1] = new_centroid[1] + f[1]
    new_brush_size += f[2] * brushFactor

  }) 
  new_centroid[0] = new_centroid[0]/faces.length
  new_centroid[1] = new_centroid[1]/faces.length

  if(centroid == []){
    last_centroid = new_centroid
  }
  else{
    last_centroid = centroid
  }
  drawingPath.push(centroid)
  centroid = new_centroid
  brush_size = new_brush_size / faces.length

  foundFaces = faces
}

// ***************************************************************************************************
// DRAWING P5

var traceScreen = function(p){
  let trace1; 
  let trace2; 
  let trace3; 
  p.preload = function(){
    trace1 = p.loadImage('images/trace_1.png')
    trace2 = p.loadImage('images/trace_2.png')
    trace3 = p.loadImage('images/trace_3.png')
  }
  var traced = false; 
  var trace_int = 0; 

  p.setup = function(){
    cWidth = 1080; 
    cHeight = p.windowHeight; 
    p.createCanvas(cWidth, cHeight);
    // p.background(dark_gray);
  }

  p.draw = function(){
    if(tracing && !traced){
      p.tint(255, 126)
      let im; 
      if(trace_int == 0){
        im = trace1; 
      }
      if(trace_int == 1){
        im = trace2; 
      }
      if(trace_int == 2){
        im = trace3; 
      }
      let imHeight = p.windowHeight
      let imWidth = im.width / im.height * imHeight
      p.image(im, 1080 / 2 - imWidth / 2, p.windowHeight / 2 - imHeight / 2, imWidth, imHeight)
      traced = true; 
      trace_int += 1; 
      if(trace_int > 2){
        trace_int = 0; 
      }
    }
    else if(!tracing){
      traced = false; 
      p.clear()
    }
  }
}

// ***************************************************************************************************
// DRAWING P5

var sketch = function(p){

  p.setup = function(){
    cWidth = 1080; 
    cHeight = p.windowHeight; 
    p.createCanvas(cWidth, cHeight);
    // p.background(dark_gray);
  }

  var isPenDown = true; 
  var enterSketch = false; 
  var needToClear = true; 

  p.draw = function(){   
    if(state == MenuState){
      p.clear(); 
      enterSketch = false; 
      return; 
    }
    if(!allPlayersFound) {
      return 
    }

    if(needToClear && state == DrawState){
      p.clear(); 
      needToClear = false; 
      drawingPath = []
    }

    // redraw whatever was here before going to the menu 
    if(!enterSketch){
      for(let i = 0; i < drawingPath.length - 1; i++){
        p.stroke(selectedColor)   
        p.strokeWeight(brush_size)

        p.line(drawingPath[i][0], drawingPath[i][1], drawingPath[i+1][0], drawingPath[i+1][1])
      }
    }

    // check if anyone is trying to delete the drawing 
    if(fists.length >= 2){
      foundFaces.forEach(function(face){
        if(checkDoubleGesture(face, fists)){
          p.clear(); 
          // p.background(dark_gray);
          // reset the drawing paths 
          drawingPathHistory.push([...drawingPath])
          drawingPath = []
        }
      })
    }

    if(palms.length >= 2 && state == InstructionState){
      p.clear(); 
      drawingPath = []
    }

    // check if someone is trying to pause drawing
    if(palms.length >= 2){
      foundFaces.forEach(function(face){
        if(checkDoubleGesture(face, palms)){
          isPenDown = false; 
        }
        else{
          isPenDown = true; 
        }
      })
    } 
    else{
      isPenDown = true;
    }
    
    if(isPenDown){
      p.stroke(selectedColor)   
      p.strokeWeight(brush_size)
      p.line(last_centroid[0], last_centroid[1], centroid[0], centroid[1])
    }
    
  }

  p.windowResized = function(){
    cWidth = p.windowWidth; 
    cHeight = p.windowHeight;  
    p.resizeCanvas(cWidth, cHeight);
  }
}

// ***************************************************************************************************
// OVERLAY P5
var overlay = function(p){

  let fist_img; 
  let palm_img; 
  let point_img; 
  let trace1; 
  p.preload = function(){
    fist_img = p.loadImage('images/one_fist.png');
    palm_img = p.loadImage('images/palms.png');
    point_img = p.loadImage('images/pointers.png');
    trace1 = p.loadImage('images/trace_1.png')
  }

  p.setup = function(){
    cWidth = 1080; 
    cHeight = p.windowHeight; 
    p.createCanvas(cWidth, cHeight);
    // p.background('rgba(245, 66, 221, 0.4)');
  }

  var bufferCount = 0; 
  p.draw = function(){   
    p.clear(); 
    if(state == MenuState){
      // might actually do stuff here... 
      return; 
    }
    if(!allPlayersFound){
      bufferCount += 1; 
      if(bufferCount > 10){
        p.fill('white')
        p.strokeWeight(1)

        let yPos = 20; 
        let recWidth = 300; 

        p.drawingContext.shadowColor = p.color(255, 255, 255)

        p.drawingContext.shadowBlur = 100;

        p.textSize(20)
        p.rect(cWidth/2 - recWidth/2, yPos, recWidth, 30)
        p.fill('#474747')
        p.noStroke(); 
        p.text("some players are not in view", cWidth/2 - recWidth/2 + 20, yPos + 20)
      }
    }
    else{
      bufferCount = 0; 
    }

    // p.strokeWeight(3)
    // p.stroke('rgba(255, 255, 255, 0.1)') 
    // p.noFill();
    // p.beginShape();
    // drawingPath.forEach(function(g){
    //   p.curveVertex(g[0], g[1]);
    // })
    // p.endShape();

    // if(bufferCount > 0){
    //   return 
    // }
    
    // p.background('rgba(39, 39, 39, 255)');
    // p.background('rgba(245, 66, 221, 0.4)');
    p.noStroke(); 
    p.drawingContext.shadowColor = selectedColor

    p.drawingContext.shadowBlur = 100;
    
    // draw each person's circle
    // check if anyone is trying to delete the drawing 
    // draw connection to the brush 
    foundFaces.forEach(function(face){

      // draw each person's circle
      let circ_color = p.color(selectedColor) 
      circ_color.setAlpha(120)
      // p.fill('#ffffffB3')
      p.fill(circ_color)
      p.noStroke(); 
      let circle_width = face[2] * facePositionFactor / 2
      p.circle(face[0] , face[1] , circle_width * 2)

      // draw connection to the brush 
      if(allPlayersFound){
        p.stroke('red')
        p.strokeWeight(5)
        p.line(face[0], face[1], centroid[0], centroid[1])
      }
    })
    if(allPlayersFound){
      // p.stroke("pink")
      p.fill(selectedColor)
      p.circle(centroid[0], centroid[1], brush_size)
    }

  }
}

// ***************************************************************************************************
// HAND OVERLAY P5
var hand_overlay = function(p){
  let fist_img; 
  let palm_img; 
  let point_img; 
  p.preload = function(){
    fist_img = p.loadImage('images/one_fist.png');
    palm_img = p.loadImage('images/one_palm.png');
    point_img = p.loadImage('images/one_pointer.png');
  }

  p.setup = function(){
    cWidth = 1080; 
    cHeight = p.windowHeight; 
    p.createCanvas(cWidth, cHeight);
  }

  p.draw = function(){   
    p.clear(); 
    if(state == MenuState || state == DrawState || state == InstructionState){
      palms.forEach(function(palm){
        let imHeight = palm[2] * palm_img.height / palm_img.width;  
        p.image(palm_img, palm[0] - 150, palm[1]- 100, palm[2], imHeight);
      })
      fists.forEach(function(fist){
        let imHeight = fist[2] * fist_img.height / fist_img.width;  
        p.image(fist_img, fist[0] - 150, fist[1]- 160, fist[2], imHeight);
      })
      pointers.forEach(function(point){
        let imHeight = point[2] * point_img.height / point_img.width;  
        p.image(point_img, point[0] - 150, point[1]- 30, point[2], imHeight);
      })
    }
  }
}

// converting functions ***************************************************************************************************
function convertBBox(obs){
  // let temp = []
  // obs.forEach(function(a){
    let bb = scaleBoundingBox(obs)
    // temp.push(bb)
  // })
  return bb
}

function scaleBoundingBox(bb){
  let xy = scalePosition(bb[0], bb[1])
  let xy2 = scalePosition(bb[2], bb[3])
  let w = xy2[0]
  return [xy[0], xy[1], w, w]
}

function scalePosition(x, y){
  let scaledX = (x+40) / (videoDimensions[0]) * cWidth; 
  let scaledY = (y+10) / videoDimensions[1] * cHeight; 
  return [scaledX, scaledY]
}

// ***************************************************************************************************
// check gestures
function checkDoubleGesture(faceBB, gestures){
  let factor = 1.3; 
  if(gestures.length < 2){
    return false 
  }
  for(let i = 0; i < gestures.length; i++){
    for(let j = 1; j < gestures.length; j++){
      if(i!=j && gestures[i][0] < faceBB[0] && gestures[j][0] > faceBB[0]){
        if(Math.abs(gestures[i][0] - faceBB[0]) < gestures[i][2] * factor && Math.abs(gestures[j][0] - (faceBB[0] + faceBB[2])) < gestures[j][2] * factor){
          return true
        }
      }
    }
  }
  return false; 
}

// ***************************************************************************************************
// MENU SCREEN
var menuScreen = function(p){
  p.setup = function(){
    cWidth = 1080; 
    cHeight = p.windowHeight; 
    p.createCanvas(cWidth, cHeight);
  }

  var lastPalmColor = -1; 
  var lastFistColor = -1; 

  p.draw = function(){
    p.clear(); 
    if(state == MenuState){
      p.background(dark_gray);

      // color picker 
      p.textSize(32)
      p.noStroke(); 
      p.fill('white')
      p.text("Drawing Color", 100 + 75, 50)
      let rectX = 100
      let rectY = 50 + 20
      let rectSize = p.windowWidth / 7; 
      let rectGap = 10; 
      p.noStroke(); 

      p.fill(dimDrawingColors[0])
      p.rect(rectX, rectY, rectSize, rectSize)
      p.fill(dimDrawingColors[1])
      p.rect(rectX + rectSize + rectGap, rectY, rectSize, rectSize)
      
      p.fill(dimDrawingColors[2])
      p.rect(rectX, rectY + rectSize + rectGap, rectSize, rectSize)
      p.fill(dimDrawingColors[3])
      p.rect(rectX + rectSize + rectGap, rectY + rectSize + rectGap, rectSize, rectSize)


      // check palms
      palms.forEach(function(inputPosition){
        let foundColumn = -1; 
        let foundRow = -1; 
        if(inputPosition[0] > rectX && inputPosition[0] < rectX + rectSize){
          foundColumn = 0
        }
        else if(inputPosition[0] > rectX + rectSize + rectGap && inputPosition[0] < rectX + 2 *rectSize + rectGap){
          foundColumn = 1
        }
        if(inputPosition[1] > rectY && inputPosition[1] < rectY + rectSize){
          foundRow = 0; 
        }
        else if(inputPosition[1] > rectY + rectSize + rectGap && inputPosition[1] < rectY + 2 *rectSize + rectGap){
          foundRow = 1
        }

        let palmColor = -1; 
        if(foundColumn != -1 && foundRow != -1){
          if(foundColumn == 0){
            if(foundRow == 0){
              palmColor = 0; 
            }
            else{
              palmColor = 2; 
            }
          }
          else {
            if(foundRow == 0){
              palmColor = 1; 
            }
            else{
              palmColor = 3; 
            }
          }
        }

        if(inputPosition[0] > 1080/2 + 30 && inputPosition[0] < 1080/2 + 30 + 450){
          if(inputPosition[1] > rectY && inputPosition && inputPosition[1] < rectY + 200){
            palmColor = 5; 
          }
        }

        if(palmColor != -1){
          lastPalmColor = palmColor
        }
      })

      // check fists 
      fists.forEach(function(inputPosition){
        let foundColumn = -1; 
        let foundRow = -1; 
        if(inputPosition[0] > rectX && inputPosition[0] < rectX + rectSize){
          foundColumn = 0
        }
        else if(inputPosition[0] > rectX + rectSize + rectGap && inputPosition[0] < rectX + 2 *rectSize + rectGap){
          foundColumn = 1
        }
        if(inputPosition[1] > rectY && inputPosition[1] < rectY + rectSize){
          foundRow = 0; 
        }
        else if(inputPosition[1] > rectY + rectSize + rectGap && inputPosition[1] < rectY + 2 *rectSize + rectGap){
          foundRow = 1
        }

        let palmColor = -1; 
        if(foundColumn != -1 && foundRow != -1){
          if(foundColumn == 0){
            if(foundRow == 0){
              palmColor = 0; 
            }
            else{
              palmColor = 2; 
            }
          }
          else {
            if(foundRow == 0){
              palmColor = 1; 
            }
            else{
              palmColor = 3; 
            }
          }
        }

        if(inputPosition[0] > 1080/2 + 30 && inputPosition[0] < 1080/2 + 30 + 450){
          if(inputPosition[1] > rectY && inputPosition && inputPosition[1] < rectY + 200){
            if(lastPalmColor != -1){
              palmColor = 5; 
            }
            
          }
        }


        // if(palmColor != -1){
        lastFistColor = palmColor
        // }
        
      })
      
      if(lastFistColor != -1 && lastFistColor != 5){
        if(lastFistColor == lastPalmColor){
          selectedColor = drawingColors[lastFistColor]
          lastFistColor = -1
        }
      }

      // draw border around the selected one 
      let drawingIndex = drawingColors.indexOf(String(selectedColor)); 
      let highLightX; 
      let highLightY; 
      if(drawingIndex == 0 || drawingIndex == 1){
        highLightY = rectY
      }
      else{
        highLightY = rectY + rectSize + rectGap
      }
      if(drawingIndex == 0 || drawingIndex == 2){
        highLightX = rectX
      }
      else{
        highLightX = rectX + rectSize + rectGap
      }
      p.fill(selectedColor)
      p.noStroke(); 
      // p.strokeWeight(8)
      p.rect(highLightX, highLightY, rectSize, rectSize)

      



      // template tracing
      
      p.textSize(32)
      p.noStroke(); 
      if(!tracing){
        p.fill('rgba(255, 255, 255, 0.4)')
      }
      else{
        p.fill('rgba(255, 255, 255, 0.8)')
      }
      p.rect(1080/2 + 30, rectY, 450, 200)
      p.fill('rgba(40, 40, 40, 0.7)')
      p.text("Tracing Mode", 1080/2 + 60, 130)
      if(!tracing){
        p.text("OFF", 1080/2 + 60, 200)
      }
      else{
        p.text("ON", 1080/2 + 60, 200)
      }
      
      if(lastFistColor == lastPalmColor && lastPalmColor == 5){
        tracing = !tracing
        lastFistColor = -1; 
        lastPalmColor = -1; 
      }
      


    }
  }
}

// ***************************************************************************************************
// WELCOME SCREEN
var welcomeScreen = function(p){

  let fist_img; 
  let palm_img; 
  let point_img; 
  let one_fist_img; 
  let one_palm_img; 
  p.preload = function(){
    fist_img = p.loadImage('images/fists.png');
    palm_img = p.loadImage('images/palms.png');
    point_img = p.loadImage('images/pointers.png');

    one_fist_img = p.loadImage('images/menu_fist.png')
    one_palm_img = p.loadImage('images/menu_palm.png')
  }

  var fade = 0;
  var fadeAmount = 10

  p.setup = function(){
    cWidth = p.windowWidth; 
    cHeight = p.windowHeight; 
    p.createCanvas(cWidth, cHeight);
    p.background(dark_gray);
  }

  p.draw = function(){    
    p.clear(); 
    p.background(dark_gray);

    if(state == WelcomeState){
      p.fill('white')
      p.textSize(48);
      p.text('welcome', 1080 / 2 - 90, p.windowHeight / 3);
      p.textSize(32);
      p.text('how many players are there?', 1080 / 2 - 200, p.windowHeight * 1.5/3)

      if(numPlayers > 0){
        p.fill(255, 255, 255, fade)
        p.textSize(25);
        p.text("press enter to continue", 1080 / 2 - 120, p.windowHeight - 50)
        p.fill(255, 255, 255, 255)
      }
      else{
        p.fill(150, 150, 150, fade)
      }
      
      p.textSize(100);
      let flashText = numPlayers > 0 ? numPlayers : "|"; 
      let flashTextPosition = numPlayers > 0 ? 1080 / 2 - 25 : 1080 / 2 - 10

      p.text(flashText, flashTextPosition, p.windowHeight * 2/3)

      
      if (fade<0){ fadeAmount=10; }
      if (fade>255){ fadeAmount=-10; }
      fade += fadeAmount; 
    }
    else if(state == InstructionState){
      p.fill(full_gray)
      p.rect(20, p.windowHeight - 200, 1040, 200 - 20)

      p.textSize(32)
      p.fill('rgb(230, 127, 255)')
      p.stroke('rgb(230, 127, 255)')
      p.text("put your hands up when you're ready", 50, p.windowHeight - 80)
      p.fill('white')
      p.stroke('white')
      p.text("step back until the circle covers your face", 50, p.windowHeight - 140)
      let imWidth = 300; 
      let imHeight = imWidth * palm_img.height / palm_img.width;  
      p.image(palm_img, 690, p.windowHeight - 250, imWidth, imHeight);
      



      // p.fill('white')
      // p.textSize(48);
      // p.text('instructions!', 1080 / 2 - 130, p.windowHeight / 3);

      // // let fist_img; 
      // // let palm_img; 
      // // let point_img; 
      // p.textSize(32);
      // let pageMargin = 20; 
      // let yStart =  p.windowHeight / 2
      // let gaps = 5; 
      // let imWidth = (1080 - 2*pageMargin - 2*gaps) / 3
      // let imHeight = imWidth * fist_img.height / fist_img.width; 

      // let x1 = pageMargin;
      // let x2 = pageMargin + imWidth + gaps; 
      // let x3 = pageMargin + 2 * imWidth + 2 * gaps; 
      // p.image(fist_img, x1, yStart, imWidth, imHeight);
      // // p.image(palm_img, x2, yStart, imWidth, imHeight);
      // p.image(point_img, x3, yStart, imWidth, imHeight);

      // p.stroke("white")
      // let yText =  yStart + 2 * imHeight / 3 + 15

      // p.text("erase", x1 + imWidth / 2 - 40 , yText)
      // // p.text("pause", x2 + imWidth / 2 - 40, yText)
      // p.text("menu", x3 + imWidth / 2 - 40, yText)

      // // flashing text
      // // if(numPlayers > 0){
      //   p.fill(255, 255, 255, fade)
      //   p.noStroke(); 
      //   // p.stroke('white');
      //   // p.strokeWeight(1)
      //   p.textSize(30);
      //   p.text("put up your hands up to continue", 1080 / 2 - 170, p.windowHeight /2)
      //   // p.fill(255, 255, 255, 255)
      // // }
      // // else{
      // //   p.fill(150, 150, 150, fade)
      // // }

      // if (fade<100){ fadeAmount=5; }
      // if (fade>255){ fadeAmount=-5; }
      // fade += fadeAmount;
      
    } 
    if(state != WelcomeState){

      p.textSize(25);
      p.noStroke(); 
      p.fill('white')

      p.text("Controls", 1080 + 55, 70)

      let guessWidth = 1080; 
      let imWidth = p.windowWidth - guessWidth; 
      let imHeight = imWidth * fist_img.height / fist_img.width;  

      let gaps = 0; 
      let y1 = 100; 
      let y2 = y1 + gaps + imHeight - 30; 
      let y3 = y2 + gaps + imHeight; 
      let x = guessWidth
      let textX = x + imWidth / 2 - 30; 

      if(state == MenuState){
        p.image(one_palm_img, x + 25, y1, imWidth * 2.3/3, imHeight * 2.3/3);
        p.image(one_fist_img, x + 25, y2, imWidth * 2.3/3, imHeight * 2.3/3);

        // p.text("cursor", textX, y1 + imHeight * 1.75/3)
        p.textSize(70)
        p.text("+", textX + 10, y2 - 10)
        p.textSize(25)
        p.text("select", textX, y2 + imHeight * 1.75/3)
        p.text("close menu", textX - 30, y3 + imHeight *2.2/3)
        p.image(point_img, x, y3, imWidth, imHeight);
      }
      else if(state == DrawState){
        p.image(fist_img, x, y1, imWidth, imHeight);

        p.text("erase", textX, y1 + imHeight *2.2/3)
        p.text("menu", textX, y3 + imHeight *2.2/3)
        p.image(point_img, x, y3, imWidth, imHeight);
      }
      
      // toggle menu image
      // p.image(point_img, x, y3, imWidth, imHeight);
      
    }
  }
}

// ***************************************************************************************************
// start

var myp5; 
var overlayP5; 
function startDrawing(){
  myp5 = new p5(sketch, 'p5sketch');
  overlayP5 = new p5(overlay, 'p5overlay')
}
var welcomeScreen = new p5(welcomeScreen, 'p5welcome')
var menuScreen = new p5(menuScreen, 'p5menu')
var handOverlay = new p5(hand_overlay, 'p5hand')
var traceScreen = new p5(traceScreen, 'p5trace')

// startVideo(); 

var numPlayers = 0; 
var allPlayersFound = false;
document.addEventListener('keypress', logKey);
function logKey(e) {
  let isNumber = isFinite(e.key);
  if(isNumber){
    numPlayers = e.key; 
  }
  else if(e.key == 'Enter'){
    // enter pressed 
    if(state == WelcomeState){
      state = InstructionState 
      startDrawing(); 
      runDetection();
    }
    else if(state == InstructionState){
      state = DrawState
      // startDrawing(); 
      // runDetection();
    }
    else if(state == DrawState){
      state = MenuState; 
    }
    else if(state == MenuState){
      state = DrawState; 
    }
  }
}

