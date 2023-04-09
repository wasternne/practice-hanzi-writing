/* GENERAL */

const canvas = document.getElementById('canvas');
canvas.width = 1024;
canvas.height = 1024;
const context = canvas.getContext('2d');
context.scale(1, -1);
context.translate(0, -canvas.height);

let hanzi;
let hanziIndex;

/* DISPLAYING */

function displayHanzi(hanziToDraw, style, transformation = (p) => p) {
    // Clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the hanzi strokes as path elements
    for (let stroke of hanziToDraw.medians) {
        context.beginPath();
        context.strokeStyle = style;
        context.lineWidth = 24;
        let p = transformation(stroke[0]);
        context.moveTo(p[0], p[1]);
        for (let i = 1; i < stroke.length; i++) {
            let p = transformation(stroke[i]);
            context.lineTo(p[0], p[1]);
        }
        context.stroke();
    }
}

const displayButton = document.getElementById('display-button');
displayButton.addEventListener('click', () => {
// Choose a random hanzi from the dictionary
    hanziIndex = Math.floor(Math.random() * dictionary.length);
    hanzi = dictionary[hanziIndex];
    displayHanzi(hanzi, "black");
});

/* DRAWING */

const writeButton = document.getElementById('write-button');
writeButton.addEventListener('click', () => {
    userStrokes.length = 0;
    context.clearRect(0, 0, canvas.width, canvas.height);
});

let isDrawing = false;
let userStrokes = [];
let currentStroke = [];
let lastPoint = null;

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const mouseCoords = getMouseCoords(canvas, e);
    lastPoint = [mouseCoords.x, mouseCoords.y];
    currentStroke.push(lastPoint);
});

canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        const mouseCoords = getMouseCoords(canvas, e);
        const currentPoint = [mouseCoords.x, mouseCoords.y];
        currentStroke.push(currentPoint);
        drawLine(lastPoint, currentPoint);
        lastPoint = currentPoint;
    }
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
    userStrokes.push(currentStroke);
    currentStroke = [];
});

function drawLine(start, end) {
    context.beginPath();
    context.moveTo(start[0], start[1]);
    context.lineTo(end[0], end[1]);
    context.stroke();
}

function getMouseCoords(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const offsetX = rect.left;
    const offsetY = rect.bottom;

    const mouseX = (event.clientX - offsetX) * scaleX;
    const mouseY = (offsetY - event.clientY) * scaleY;

    return { x: mouseX, y: mouseY };
}

/* CHECKING */

const checkButton = document.getElementById('check-button');
checkButton.addEventListener('click', () => {
    let bestTransform = findBestTransformation();
    repaintResult(checkHanzi(transformHanzi(bestTransform)), bestTransform);
});

function findBestTransformation() {
    let bestResult = checkHanzi(hanzi).score;
    let bestTransformation = {
        scaleX: 1,
        scaleY: 1,
        translateX: 0,
        translateY: 0,
        rotate: 0,
        slant: 0,
        tilt: 0
    };
    let step = 1;
    for (let i = 0; i < 100000; i++) {
        let newTransform = tryToImprove(bestResult, bestTransformation, step);
        if (newTransform !== null) {
            bestTransformation = newTransform;
            bestResult = newTransform.score;
            step *= 3/3;
            console.log("Improved to " + bestResult);
            // displayHanzi(transformHanzi(bestTransformation), "#666666");
        }
    }
    return bestTransformation;
}

function transformHanzi(tr) {
    let transformedHanzi = {
        "character": hanzi.character,
        "medians": []
    };
    for (let i = 0; i < hanzi.medians.length; i++) {
        let transformedMedian = [];
        for (let j = 0; j < hanzi.medians[i].length; j++) {
            let transformedPoint = transform(hanzi.medians[i][j], tr.scaleX, tr.scaleY, tr.translateX, tr.translateY, tr.rotate, tr.slant, tr.tilt);
            transformedMedian.push(transformedPoint);
        }
        transformedHanzi.medians.push(transformedMedian);
    }
    return transformedHanzi;
}

function tryToImprove(currentScore, tr, step) {
    let scale = 0.5 - Math.random();
    tr2 = {
        scaleX: tr.scaleX + step * scale,
        scaleY: tr.scaleY + step * scale,
        translateX: tr.translateX + 100 * step * (0.5 - Math.random()),
        translateY: tr.translateY + 100 * step * (0.5 - Math.random()),
        rotate: tr.rotate + 10 * step * (0.5 - Math.random()),
        slant: tr.slant + 10 * step * (0.5 - Math.random()),
        tilt: tr.tilt + 10 * step * (0.5 - Math.random())
    }
    let th2 = transformHanzi(tr2);
    let score2 = checkHanzi(th2).score;
    if (score2 >= currentScore) {
        return null;
    } else {
        tr2.score = score2;
        return tr2;
    }
}

const checkDetailisation = 10;

function checkHanzi(transformedHanzi) {

    const userStrokesAnalisys = { strokes: [], maxError: 0, score: 0 };

    userStrokesAnalisys.strokes.length = 0;
    userStrokesAnalisys.maxError = 0;

    // The stroke count must be the same.
    const strokeCount = transformedHanzi.medians.length;
    if (strokeCount !== userStrokes.length) return 0;

    let totalError = 0;

    for (let s = 0; s < strokeCount; s++) {
        let resultStroke = [];

        const dictStrokeLength = calculateStrokeLength(transformedHanzi.medians[s]);

        // Divide the corresponding strokes into 10 equal parts
        const dictStrokeParts = divideStrokeIntoParts(transformedHanzi.medians[s], checkDetailisation);
        const userStrokeParts = divideStrokeIntoParts(userStrokes[s], checkDetailisation);

        let error = 0;
        // Compare each part of the user stroke with the corresponding part of the dictionary stroke
        for (let i = 0; i < checkDetailisation; i++) {
            const userPoint = userStrokeParts[i];
            const dictPoint = dictStrokeParts[i];
            const distance = calculateDistance(userPoint, dictPoint);
            // TODO: Consider other scoring methods.
            error += distance;
            if (distance > userStrokesAnalisys.maxError) userStrokesAnalisys.maxError = distance;
            resultStroke.push([userPoint[0], userPoint[1], distance]);
        }
        error /= checkDetailisation;
        totalError += error;

        userStrokesAnalisys.strokes.push(resultStroke);
    }
    userStrokesAnalisys.score = totalError / strokeCount;
    return userStrokesAnalisys;
}

function calculateStrokeLength(stroke) {
    let length = 0;
    for (let i = 1; i < stroke.length; i++) {
        length += calculateDistance(stroke[i], stroke[i-1]);
    }
    return length;
}

function calculateDistance(p1, p2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return Math.sqrt(dx*dx + dy*dy);
}

function divideStrokeIntoParts(stroke, numParts) {

    let distanceBetweenPoints = calculateStrokeLength(stroke) / (numParts - 1);

    // Initialize variables for the loop
    let currentPointIndex = 0;
    let currentPoint = stroke[0];
    let currentDistance = 0;
    let newPoints = [currentPoint];

    // Loop through the path, adding points to the new path
    for (let i = 1; i < numParts - 1; i++) {
        // Calculate the target distance for the next point
        let targetDistance = i * distanceBetweenPoints;

        // Move along the path until we reach the target distance
        while (currentDistance + calculateDistance(currentPoint, stroke[currentPointIndex + 1]) < targetDistance) {
            currentDistance += calculateDistance(currentPoint, stroke[currentPointIndex + 1]);
            currentPointIndex++;
            currentPoint = stroke[currentPointIndex];
        }

        // Calculate the position of the new point
        let remainingDistance = targetDistance - currentDistance;
        let dx = stroke[currentPointIndex + 1][0] - currentPoint[0];
        let dy = stroke[currentPointIndex + 1][1] - currentPoint[1];
        let fraction = remainingDistance / Math.sqrt(dx * dx + dy * dy);
        let newX = currentPoint[0] + fraction * dx;
        let newY = currentPoint[1] + fraction * dy;
        newPoints.push([newX, newY]);
    }

    // Add the last point to the new path
    newPoints.push(stroke[stroke.length - 1]);

    return newPoints;
}

function repaintResult(result, bestTransform) {
    displayHanzi(transformHanzi(bestTransform), "#666666",
        (p) => transform(p, 1, 1, 0, 0, 0, 0, 10)
    );
    drawResultStrokes(result);
}

function drawResultStrokes(analisys) {
    for (let stroke of analisys.strokes) {
        for (let i = 1; i < stroke.length; i++) {
            context.beginPath();
            context.moveTo(stroke[i-1][0], stroke[i-1][1]);
            context.lineTo(stroke[i][0], stroke[i][1]);
            const gradient = context.createLinearGradient(stroke[i-1][0], stroke[i-1][1], stroke[i][0], stroke[i][1]);

            let colorA = "#" + Math.round(Math.min(1, stroke[i-1][2] / analisys.maxError) * 255).toString(16).padStart(2, "0") + "0000";
            let colorB = "#" + Math.round(Math.min(1, stroke[i][2] / analisys.maxError) * 255).toString(16).padStart(2, "0") + "0000";

            gradient.addColorStop(0, colorA);
            gradient.addColorStop(1, colorB);
            context.strokeStyle = gradient;
            context.stroke();
        }
    }
}

function transform(point, scaleX, scaleY, translateX, translateY, rotate, slant, tilt) {

    const mScale = [
        [scaleX, 0],
        [0, scaleY]
    ];
    const mRotate = [
        [Math.cos(rotate), -Math.sin(rotate)],
        [Math.sin(rotate), Math.cos(rotate)]
    ];
    const slantR = Math.PI * slant / 180;
    const mShearX = [
        [1, Math.tan(slantR)],
        [0, 1]
    ];
    const tiltR = Math.PI * tilt / 180;
    const mShearY = [
        [1, 0],
        [Math.tan(tiltR), 1]
    ];

    let newP = applyMatrix(mScale, applyMatrix(mRotate, applyMatrix(mShearX, applyMatrix(mShearY, point))));
    newP[0] += translateX;
    newP[1] += translateY;
    return newP;
}

function applyMatrix(m, p) {
    return [
        m[0][0] * p[0] + m[0][1] * p[1],
        m[1][0] * p[0] + m[1][1] * p[1]
    ];
}