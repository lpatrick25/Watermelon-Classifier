import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  IonApp,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  setupIonicReact,
  IonCardTitle,
  IonCardHeader,
  IonCard,
  IonCardContent,
  IonButton,
  IonText,
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
  IonProgressBar,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';
import {
  homeOutline,
  folderOutline,
  constructOutline,
  cubeOutline,
  cameraOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import axios from 'axios';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraDirection, CameraResultType, CameraSource } from '@capacitor/camera';
import './App.css';

import * as tf from '@tensorflow/tfjs';
import * as tflite from '@tensorflow/tfjs-tflite';
import { NamedTensorMap } from '@tensorflow/tfjs-core';

// Import components
import DatasetManager from './components/DatasetManager';
import ModelTrainer from './components/ModelTrainer';
import ModelManager from './components/ModelManager';

// Initialize Ionic React
setupIonicReact();

// Core and optional Ionic CSS
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// Load OpenCV.js
declare var cv: any;

const BACKEND_URL = 'http://192.168.100.70:8502';
const API = `${BACKEND_URL}/api`;

const CLASS_NAMES = [
  'crimsonsweet_ripe',
  'crimsonsweet_unripe',
  'other_variety',
  'not_valid',
];

const Home: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<{ status: string; error?: string; model_loaded?: boolean } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<tflite.TFLiteModel | null>(null);

  const initializeApp = async () => {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: '#2196f3' });
    } catch (error) {
      console.error('StatusBar initialization failed:', error);
      await StatusBar.setBackgroundColor({ color: '#1565c0' }).catch(() => { });
    }
  };

  const checkApiStatus = async () => {
    try {
      const response = await axios.get(`${API}/health`);
      setApiStatus(response.data);
    } catch (e: any) {
      console.error('API health check failed:', e);
      setApiStatus({ status: 'unhealthy', error: e.message });
    }
  };

  const loadOpenCV = async () => {
    if (typeof cv === 'undefined') {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://docs.opencv.org/4.5.5/opencv.js';
        script.async = true;
        script.onload = resolve;
        document.body.appendChild(script);
      });
    }
  };

  const loadModel = async () => {
    try {
      // public\assets\MobileNetV2CNN.tflite
      // const m = await tflite.loadTFLiteModel('../public/assets/MobileNetV2CNN.tflite');
      const m = await tflite.loadTFLiteModel('assets/MobileNetV2CNN.tflite');
      setModel(m);
      console.log('TFLite model loaded');
    } catch (err) {
      console.error('Model load error:', err);
      setError('Failed to load TFLite model');
    }
  };

  useEffect(() => {
    loadOpenCV().then(() => {
      loadModel();
      if (Capacitor.isNativePlatform()) {
        initializeApp();
      }
    });
  }, []);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target) {
          setPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      setError(null);
      setPrediction(null);
    } else {
      setError('Please select a valid image file (JPG, PNG, BMP)');
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const startCamera = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: CameraDirection.Rear,
      });

      if (image.dataUrl) {
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        handleFileSelect(file);
        setError(null);
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError('Camera access failed: ' + (err as { message: string }).message);
      } else {
        setError('Camera access failed: Unknown error');
      }
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            handleFileSelect(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    let s = max === 0 ? 0 : delta / max;
    const v = max;

    if (delta !== 0) {
      if (max === r) {
        h = ((g - b) / delta) % 6;
      } else if (max === g) {
        h = (b - r) / delta + 2;
      } else {
        h = (r - g) / delta + 4;
      }
      h *= 60;
      if (h < 0) h += 360;
    }

    return [h, s, v];
  };

  const extractVisualFeatures = async (img: HTMLImageElement): Promise<{ [key: string]: number }> => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Convert to HSV using OpenCV.js
      const src = cv.imread(img);
      const hsv = new cv.Mat();
      cv.cvtColor(src, hsv, cv.COLOR_RGB2HSV);

      // Green Coverage
      const lowerGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [35, 40, 40, 0]);
      const upperGreen = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [85, 255, 255, 255]);
      const greenMask = new cv.Mat();
      cv.inRange(hsv, lowerGreen, upperGreen, greenMask);
      const greenPixels = cv.countNonZero(greenMask);
      const greenCoverage = greenPixels / (hsv.rows * hsv.cols);

      // Color Saturation
      let totalSaturation = 0;
      let totalValue = 0;
      for (let i = 0; i < hsv.data.length; i += 3) {
        totalSaturation += hsv.data[i + 1];
        totalValue += hsv.data[i + 2];
      }
      const pixelCount = hsv.rows * hsv.cols;
      const saturation = (totalSaturation / pixelCount / 255) * 0.6 + (totalValue / pixelCount / 255) * 0.4;

      // Stripe Pattern (using Canny edge detection)
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGB2GRAY);
      const blurred = new cv.Mat();
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
      const edges = new cv.Mat();
      cv.Canny(blurred, edges, 50, 150);
      const edgePixels = cv.countNonZero(edges);
      const stripePattern = edgePixels / (hsv.rows * hsv.cols);

      // Ground Spot
      const lowerYellow = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [20, 80, 80, 0]);
      const upperYellow = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [35, 255, 255, 255]);
      const yellowMask = new cv.Mat();
      cv.inRange(hsv, lowerYellow, upperYellow, yellowMask);
      const yellowPixels = cv.countNonZero(yellowMask);
      const groundSpot = yellowPixels / (hsv.rows * hsv.cols);

      // Clean up
      src.delete();
      hsv.delete();
      lowerGreen.delete();
      upperGreen.delete();
      greenMask.delete();
      gray.delete();
      blurred.delete();
      edges.delete();
      lowerYellow.delete();
      upperYellow.delete();
      yellowMask.delete();

      return {
        green_coverage: greenCoverage,
        color_saturation: saturation,
        stripe_pattern: stripePattern,
        ground_spot: groundSpot,
      };
    } catch (e) {
      console.error('Error extracting visual features:', e);
      return {
        green_coverage: 0.0,
        color_saturation: 0.0,
        stripe_pattern: 0.0,
        ground_spot: 0.0,
      };
    }
  };

  const extractShapeFeatures = async (img: HTMLImageElement): Promise<{ [key: string]: number }> => {
    try {
      const src = cv.imread(img);
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGB2GRAY);
      const thresh = new cv.Mat();
      cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      if (contours.size() === 0) {
        src.delete();
        gray.delete();
        thresh.delete();
        contours.delete();
        hierarchy.delete();
        return { shape_score: 0.0, roundness: 0.0, aspect_ratio: 0.0 };
      }

      // Find largest contour
      let maxArea = 0;
      let largestContourIdx = 0;
      for (let i = 0; i < contours.size(); i++) {
        const area = cv.contourArea(contours.get(i));
        if (area > maxArea) {
          maxArea = area;
          largestContourIdx = i;
        }
      }

      const largestContour = contours.get(largestContourIdx);
      const area = cv.contourArea(largestContour);
      const perimeter = cv.arcLength(largestContour, true);

      if (perimeter === 0) {
        src.delete();
        gray.delete();
        thresh.delete();
        contours.delete();
        hierarchy.delete();
        return { shape_score: 0.0, roundness: 0.0, aspect_ratio: 0.0 };
      }

      const roundness = (4 * Math.PI * area) / (perimeter * perimeter);
      const epsilon = 0.015 * perimeter;
      const approx = new cv.Mat();
      cv.approxPolyDP(largestContour, approx, epsilon, true);
      const shapeScore = 1.0 / Math.max(approx.rows, 1);

      const rect = cv.boundingRect(largestContour);
      const aspectRatio = rect.width / rect.height;

      src.delete();
      gray.delete();
      thresh.delete();
      contours.delete();
      hierarchy.delete();
      approx.delete();

      return {
        shape_score: Math.min(shapeScore, 1.0),
        roundness: Math.min(roundness, 1.0),
        aspect_ratio: Math.min(Math.max(aspectRatio, 0.0), 2.0),
      };
    } catch (e) {
      console.error('Error extracting shape features:', e);
      return { shape_score: 0.0, roundness: 0.0, aspect_ratio: 0.0 };
    }
  };

  const extractSurfaceFeatures = async (img: HTMLImageElement): Promise<{ [key: string]: number }> => {
    try {
      const src = cv.imread(img);
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGB2GRAY);
      const hsv = new cv.Mat();
      cv.cvtColor(src, hsv, cv.COLOR_RGB2HSV);

      // Matte Appearance
      const blurred = new cv.Mat();
      cv.GaussianBlur(gray, blurred, new cv.Size(7, 7), 0);
      const mean = new cv.Mat();
      cv.blur(blurred, mean, new cv.Size(5, 5));
      const sqrMean = new cv.Mat();
      cv.pow(blurred, 2, sqrMean);
      cv.blur(sqrMean, sqrMean, new cv.Size(5, 5));
      const meanSqr = new cv.Mat();
      cv.pow(mean, 2, meanSqr);
      const variance = new cv.Mat();
      cv.subtract(sqrMean, meanSqr, variance);
      const stdDev = new cv.Mat();
      cv.sqrt(variance, stdDev);
      const matteScore = 1.0 - (cv.mean(stdDev)[0] / 255.0);

      // Color Uniformity
      const hStd = cv.meanStdDev(hsv.ucharPtr(0, 0)[0])[1] / 180.0;
      const sStd = cv.meanStdDev(hsv.ucharPtr(0, 0)[1])[1] / 255.0;
      const vStd = cv.meanStdDev(hsv.ucharPtr(0, 0)[2])[1] / 255.0;
      const colorUniformity = 1.0 - ((hStd + sStd + vStd) / 3.0);

      // Texture Contrast (simplified without GLCM)
      const sobelX = new cv.Mat();
      cv.Sobel(gray, sobelX, cv.CV_64F, 1, 0);
      const sobelY = new cv.Mat();
      cv.Sobel(gray, sobelY, cv.CV_64F, 0, 1);
      const magnitude = new cv.Mat();
      cv.magnitude(sobelX, sobelY, magnitude);
      const textureContrast = Math.min(cv.mean(magnitude)[0] / 255.0, 1.0);

      src.delete();
      gray.delete();
      hsv.delete();
      blurred.delete();
      mean.delete();
      sqrMean.delete();
      meanSqr.delete();
      variance.delete();
      stdDev.delete();
      sobelX.delete();
      sobelY.delete();
      magnitude.delete();

      return {
        matte_appearance: Math.max(matteScore, 0.0),
        color_uniformity: Math.max(colorUniformity, 0.0),
        texture_contrast: textureContrast,
      };
    } catch (e) {
      console.error('Error extracting surface features:', e);
      return { matte_appearance: 0.0, color_uniformity: 0.0, texture_contrast: 0.0 };
    }
  };

  const parseClassName = (className: string): [string, string] => {
    if (className === 'not_valid') return ['unknown', 'unknown'];
    if (className === 'other_variety') return ['other', 'unknown'];
    const parts = className.split('_');
    const variety = parts[0];
    const ripeness = parts[1] || 'unknown';
    return [variety, ripeness];
  };

  const classifyImage = async () => {
    if (!selectedFile || !model) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const img = new Image();
      img.src = preview!;
      await new Promise((res) => (img.onload = res));

      // Preprocess image for model
      const inputTensor = tf.browser
        .fromPixels(img)
        .resizeBilinear([224, 224])
        .toFloat()
        .div(127.5)
        .sub(1.0)
        .expandDims(0);

      // Run model inference
      const output = model.predict(inputTensor) as tf.Tensor | tf.Tensor[] | NamedTensorMap;
      console.log('Model output:', output); // Debug: Log output to inspect structure

      let outputTensor: tf.Tensor;

      // Handle different output types
      if (output instanceof tf.Tensor) {
        // Single tensor output
        outputTensor = output;
      } else if (Array.isArray(output)) {
        // Array of tensors
        if (output.length === 0) {
          throw new Error('Model output is an empty array');
        }
        outputTensor = output[0]; // Assume first tensor is the desired output
      } else if (typeof output === 'object' && output !== null) {
        // NamedTensorMap
        if ('dense_1' in output) {
          const tensor = (output as NamedTensorMap)['dense_1'];
          if (!(tensor instanceof tf.Tensor)) {
            throw new Error("Expected 'dense_1' to be a Tensor in model output");
          }
          outputTensor = tensor;
        } else {
          throw new Error("Expected 'dense_1' key in model output, but not found");
        }
      } else {
        throw new Error('Unexpected output type from model.predict');
      }

      // Verify output tensor shape
      if (outputTensor.shape.length !== 2 || outputTensor.shape[0] !== 1 || outputTensor.shape[1] !== 4) {
        throw new Error(`Unexpected output shape: ${outputTensor.shape}, expected [1, 4]`);
      }

      const scores = Array.from(outputTensor.dataSync());

      // Dispose tensors to prevent memory leaks
      if (output instanceof tf.Tensor) {
        output.dispose();
      } else if (Array.isArray(output)) {
        output.forEach((tensor) => tensor.dispose());
      } else if (typeof output === 'object' && output !== null) {
        Object.values(output as NamedTensorMap).forEach((tensor) => tensor.dispose());
      }
      inputTensor.dispose();

      // Extract features
      const visualFeatures = await extractVisualFeatures(img);
      const shapeFeatures = await extractShapeFeatures(img);
      const surfaceFeatures = await extractSurfaceFeatures(img);

      // Get predicted class
      const maxIdx = scores.indexOf(Math.max(...scores));
      const maxConfidence = scores[maxIdx];

      // Adjust confidence based on features
      const featureConfidence =
        visualFeatures.color_saturation * 0.3 +
        visualFeatures.stripe_pattern * 0.3 +
        shapeFeatures.roundness * 0.2 +
        surfaceFeatures.color_uniformity * 0.2;
      const confidenceThreshold = 0.65;
      const adjustedConfidence = maxConfidence * 0.7 + featureConfidence * 0.3;

      const predictedClass =
        adjustedConfidence < confidenceThreshold ? 'not_valid' : CLASS_NAMES[maxIdx];
      const [variety, ripeness] = parseClassName(predictedClass);

      const confidenceBreakdown = CLASS_NAMES.reduce(
        (acc, cls, idx) => ({ ...acc, [cls]: scores[idx] }),
        {} as { [key: string]: number }
      );

      const newPrediction = {
        variety,
        ripeness,
        predicted_class: predictedClass,
        confidence: adjustedConfidence,
        confidence_breakdown: confidenceBreakdown,
        visual_analysis: visualFeatures,
        shape_analysis: shapeFeatures,
        surface_analysis: surfaceFeatures,
        is_valid: predictedClass !== 'not_valid',
        is_crimsonsweet: variety === 'crimsonsweet',
      };

      console.log('Prediction:', newPrediction);
      setPrediction(newPrediction);
    } catch (err) {
      console.error('Classification error:', err);
      setError('Classification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setSelectedFile(null);
    setPreview(null);
    setPrediction(null);
    setError(null);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFeatureName = (name: string) => {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <>
      {/* <IonHeader>
        <IonToolbar className="watermelon-gradient">
          <IonTitle className="fw-bold text-dark">MeloScan</IonTitle>
        </IonToolbar>
      </IonHeader> */}
      <IonContent fullscreen className="bg-light">
        <div className="container py-5">
          <div className="text-center mb-5">
            <h1 className="display-4 fw-bold text-dark mb-3">
              MeloScan
            </h1>
            <p className="lead text-muted">
              Detect Crimsonsweet F1 variety and ripeness
            </p>
            {apiStatus && (
              <div className="mt-4">
                <span
                  className={`badge rounded-pill px-4 py-2 fs-6 ${apiStatus.status === 'healthy' ? 'bg-success text-white' : 'bg-danger text-white'
                    }`}
                >
                  {apiStatus.status === 'healthy' ? 'API Ready' : 'API Error'}
                  {apiStatus.model_loaded && ' • Model Loaded'}
                </span>
              </div>
            )}
          </div>
          <div className="mb-5">
            <IonCard className="shadow-sm border-0 rounded-3">
              <IonCardHeader className="watermelon-gradient">
                <IonCardTitle className="text-center text-white fw-bold fs-4">
                  Watermelon Image Classifier
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent className="p-4">
                <div
                  className={`file-upload-area border-2 border-dashed rounded-3 p-5 text-center transition-colors ${dragActive ? 'drag-active' : ''
                    }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {!preview ? (
                    <div className="space-y-4">
                      <IonIcon icon={cameraOutline} className="text-success fs-1" />
                      <IonText color="medium">
                        <p className="fs-5">Drag and drop your watermelon image here</p>
                        <p className="text-sm">or</p>
                      </IonText>
                      <div className="d-flex justify-content-center gap-3">
                        <IonButton onClick={() => fileInputRef.current?.click()} color="success">
                          Choose File
                        </IonButton>
                        <IonButton
                          onClick={cameraActive ? stopCamera : startCamera}
                          color={cameraActive ? 'danger' : 'success'}
                        >
                          {cameraActive ? 'Stop Camera' : 'Use Camera'}
                        </IonButton>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-w-full max-h-80 mx-auto rounded-3 shadow-sm"
                      />
                      <div className="d-flex justify-content-center gap-3">
                        <IonButton onClick={classifyImage} disabled={loading} color="success">
                          {loading ? <IonSpinner name="crescent" /> : 'Classify Watermelon'}
                        </IonButton>
                        <IonButton onClick={clearAll} color="medium">
                          Clear
                        </IonButton>
                      </div>
                    </div>
                  )}
                </div>
                {cameraActive && (
                  <div className="mt-4 text-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="max-w-full rounded-3 shadow-sm video-preview"
                    />
                    <div className="mt-4">
                      <IonButton onClick={capturePhoto} color="success">
                        <IonIcon slot="start" icon={cameraOutline} />
                        Capture Photo
                      </IonButton>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="d-none" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="d-none"
                />
                {error && (
                  <IonCard className="mt-4 bg-danger-subtle border border-danger rounded-3">
                    <IonCardContent>
                      <IonText color="danger" className="fs-6">{error}</IonText>
                    </IonCardContent>
                  </IonCard>
                )}
                {prediction && (
                  <IonCard className="mt-4 shadow-sm border-0 rounded-3">
                    <IonCardHeader>
                      <IonCardTitle className="fw-bold text-dark">Classification Results</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonGrid>
                        <IonRow>
                          <IonCol size="12" size-md="6">
                            <IonCard className="border-0 shadow-sm rounded-3">
                              <IonCardHeader>
                                <IonText className="fw-semibold text-dark">Variety</IonText>
                              </IonCardHeader>
                              <IonCardContent>
                                <IonText
                                  className={`px-3 py-1 rounded-pill text-sm fw-medium ${prediction.is_crimsonsweet
                                    ? 'bg-success-subtle text-success'
                                    : 'bg-warning-subtle text-warning'
                                    }`}
                                >
                                  {prediction.variety === 'crimsonsweet'
                                    ? 'Crimsonsweet F1'
                                    : prediction.variety === 'other'
                                      ? 'Other Variety'
                                      : 'Unknown'}
                                </IonText>
                              </IonCardContent>
                            </IonCard>
                          </IonCol>
                          <IonCol size="12" size-md="6">
                            <IonCard className="border-0 shadow-sm rounded-3">
                              <IonCardHeader>
                                <IonText className="fw-semibold text-dark">Ripeness</IonText>
                              </IonCardHeader>
                              <IonCardContent>
                                <IonText
                                  className={`px-3 py-1 rounded-pill text-sm fw-medium ${prediction.ripeness === 'ripe'
                                    ? 'bg-success-subtle text-success'
                                    : prediction.ripeness === 'unripe'
                                      ? 'bg-warning-subtle text-warning'
                                      : 'bg-secondary-subtle text-secondary'
                                    }`}
                                >
                                  {prediction.ripeness === 'ripe'
                                    ? 'Ripe'
                                    : prediction.ripeness === 'unripe'
                                      ? 'Unripe'
                                      : 'Unknown'}
                                </IonText>
                              </IonCardContent>
                            </IonCard>
                          </IonCol>
                        </IonRow>
                      </IonGrid>
                      <div className="mt-5">
                        <IonText className="fw-semibold text-dark">Overall Confidence</IonText>
                        <div className="d-flex align-items-center mt-2">
                          <IonProgressBar
                            value={prediction.confidence}
                            className="confidence-bar flex-grow-1"
                          />
                          <IonText className="ms-3 text-sm">
                            {(prediction.confidence * 100).toFixed(1)}%
                          </IonText>
                        </div>
                      </div>
                      <IonCard
                        className={`mt-4 ${prediction.is_valid ? 'bg-success-subtle' : 'bg-danger-subtle'
                          } border-0 rounded-3`}
                      >
                        <IonCardContent>
                          <div className="d-flex align-items-center">
                            <IonIcon
                              icon={prediction.is_valid ? checkmarkCircleOutline : closeCircleOutline}
                              className="me-2 fs-5"
                            />
                            <IonText className={prediction.is_valid ? 'text-success' : 'text-danger'}>
                              {prediction.is_valid
                                ? 'Valid watermelon detected'
                                : 'Invalid or unclear image - please try another photo'}
                            </IonText>
                          </div>
                        </IonCardContent>
                      </IonCard>
                      <div className="mt-5">
                        <IonText className="fw-semibold text-dark">Confidence Breakdown</IonText>
                        <div className="space-y-3 mt-3">
                          {Object.entries(prediction.confidence_breakdown as { [key: string]: number }).map(
                            ([className, confidence]) => (
                              <div key={className} className="d-flex align-items-center">
                                <IonText className="w-32 text-sm text-capitalize text-dark">
                                  {className.replace('_', ' ')}
                                </IonText>
                                <IonProgressBar
                                  value={confidence}
                                  className="flex-grow-1 mx-3"
                                  color="success"
                                />
                                <IonText className="w-12 text-sm">
                                  {(confidence * 100).toFixed(1)}%
                                </IonText>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                      {(prediction.visual_analysis || prediction.shape_analysis || prediction.surface_analysis) && (
                        <div className="mt-5">
                          <IonText className="fw-semibold text-dark">Feature Analysis</IonText>
                          <IonGrid className="mt-3">
                            <IonRow>
                              {prediction.visual_analysis && (
                                <IonCol size="12" size-md="4">
                                  <IonCard className="border-0 shadow-sm rounded-3">
                                    <IonCardHeader>
                                      <IonText className="fw-semibold text-dark">Visual Features</IonText>
                                    </IonCardHeader>
                                    <IonCardContent>
                                      <div className="space-y-3">
                                        {Object.entries(prediction.visual_analysis as { [key: string]: number }).map(
                                          ([key, value]) => (
                                            <div key={key} className="d-flex align-items-center">
                                              <IonText className="w-32 text-sm text-capitalize text-dark">
                                                {formatFeatureName(key)}
                                              </IonText>
                                              <IonProgressBar
                                                value={value}
                                                className="flex-grow-1 mx-3"
                                                color="success"
                                              />
                                              <IonText className="w-12 text-sm">
                                                {(value * 100).toFixed(1)}%
                                              </IonText>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </IonCardContent>
                                  </IonCard>
                                </IonCol>
                              )}
                              {prediction.shape_analysis && (
                                <IonCol size="12" size-md="4">
                                  <IonCard className="border-0 shadow-sm rounded-3">
                                    <IonCardHeader>
                                      <IonText className="fw-semibold text-dark">Shape Features</IonText>
                                    </IonCardHeader>
                                    <IonCardContent>
                                      <div className="space-y-3">
                                        {Object.entries(prediction.shape_analysis as { [key: string]: number }).map(
                                          ([key, value]) => (
                                            <div key={key} className="d-flex align-items-center">
                                              <IonText className="w-32 text-sm text-capitalize text-dark">
                                                {formatFeatureName(key)}
                                              </IonText>
                                              <IonProgressBar
                                                value={value}
                                                className="flex-grow-1 mx-3"
                                                color="primary"
                                              />
                                              <IonText className="w-12 text-sm">
                                                {(value * 100).toFixed(1)}%
                                              </IonText>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </IonCardContent>
                                  </IonCard>
                                </IonCol>
                              )}
                              {prediction.surface_analysis && (
                                <IonCol size="12" size-md="4">
                                  <IonCard className="border-0 shadow-sm rounded-3">
                                    <IonCardHeader>
                                      <IonText className="fw-semibold text-dark">Surface Features</IonText>
                                    </IonCardHeader>
                                    <IonCardContent>
                                      <div className="space-y-3">
                                        {Object.entries(prediction.surface_analysis as { [key: string]: number }).map(
                                          ([key, value]) => (
                                            <div key={key} className="d-flex align-items-center">
                                              <IonText className="w-32 text-sm text-capitalize text-dark">
                                                {formatFeatureName(key)}
                                              </IonText>
                                              <IonProgressBar
                                                value={value}
                                                className="flex-grow-1 mx-3"
                                                color="secondary"
                                              />
                                              <IonText className="w-12 text-sm">
                                                {(value * 100).toFixed(1)}%
                                              </IonText>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </IonCardContent>
                                  </IonCard>
                                </IonCol>
                              )}
                            </IonRow>
                          </IonGrid>
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>
                )}
              </IonCardContent>
            </IonCard>
          </div>
          <div className="text-center mb-5">
            <h2 className="h3 fw-bold text-dark">Features</h2>
          </div>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card shadow-sm h-100 border-0 rounded-3 text-center">
                <div className="card-body p-4">
                  <div className="text-success mb-3">
                    <IonIcon icon={homeOutline} className="fs-1" />
                  </div>
                  <h5 className="fw-semibold text-dark">Variety Detection</h5>
                  <p className="text-muted">
                    Specifically trained to identify Crimsonsweet F1 variety watermelons.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm h-100 border-0 rounded-3 text-center">
                <div className="card-body p-4">
                  <div className="text-success mb-3">
                    <IonIcon icon={folderOutline} className="fs-1" />
                  </div>
                  <h5 className="fw-semibold text-dark">Ripeness Analysis</h5>
                  <p className="text-muted">
                    Accurately determine if your watermelon is ripe or unripe.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm h-100 border-0 rounded-3 text-center">
                <div className="card-body p-4">
                  <div className="text-success mb-3">
                    <IonIcon icon={cubeOutline} className="fs-1" />
                  </div>
                  <h5 className="fw-semibold text-dark">Confidence Scoring</h5>
                  <p className="text-muted">
                    Get detailed confidence scores for reliable classification.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </>
  );
};

// const App: React.FC = () => {
//   return (
//     <IonApp>
//       <IonReactRouter>
//         <IonTabs>
//           <IonRouterOutlet>
//             <Route exact path="/classify">
//               <Home />
//             </Route>
//             <Route exact path="/datasets">
//               <DatasetManager />
//             </Route>
//             <Route exact path="/train">
//               <ModelTrainer />
//             </Route>
//             <Route exact path="/models">
//               <ModelManager />
//             </Route>
//             <Route exact path="/">
//               <Redirect to="/classify" />
//             </Route>
//           </IonRouterOutlet>
//           <IonTabBar slot="bottom" className="shadow-sm border-top bg-white">
//             <IonTabButton tab="classify" href="/classify" className="nav-link text-dark">
//               <IonIcon aria-hidden="true" icon={homeOutline} className="fs-4" />
//               <IonLabel className="fs-6 fw-medium">Classify</IonLabel>
//             </IonTabButton>
//             <IonTabButton tab="datasets" href="/datasets" className="nav-link text-dark">
//               <IonIcon aria-hidden="true" icon={folderOutline} className="fs-4" />
//               <IonLabel className="fs-6 fw-medium">Datasets</IonLabel>
//             </IonTabButton>
//             <IonTabButton tab="train" href="/train" className="nav-link text-dark">
//               <IonIcon aria-hidden="true" icon={constructOutline} className="fs-4" />
//               <IonLabel className="fs-6 fw-medium">Train</IonLabel>
//             </IonTabButton>
//             <IonTabButton tab="models" href="/models" className="nav-link text-dark">
//               <IonIcon aria-hidden="true" icon={cubeOutline} className="fs-4" />
//               <IonLabel className="fs-6 fw-medium">Models</IonLabel>
//             </IonTabButton>
//           </IonTabBar>
//         </IonTabs>
//       </IonReactRouter>
//     </IonApp>
//   );
// };
const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <Route exact path="/classify">
          <Home />
        </Route>
        <Route exact path="/">
          <Redirect to="/classify" />
        </Route>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;