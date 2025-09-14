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
import './App.css';

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

const BACKEND_URL = 'http://192.168.100.8:8502';
const API = `${BACKEND_URL}/api`;

// ==========================
// Home Component (with ImageClassifier integrated)
// ==========================
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

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initializeApp();
    }
  }, []);

  const initializeApp = async () => {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: '#2196f3' }); // Material Blue
    } catch (error) {
      console.error('StatusBar initialization failed:', error);
      await StatusBar.setBackgroundColor({ color: '#1565c0' }).catch(() => {}); // fallback
    }
  };

  // Check API status
  const checkApiStatus = async () => {
    try {
      const response = await axios.get(`${API}/health`);
      setApiStatus(response.data);
    } catch (e: any) {
      console.error('API health check failed:', e);
      setApiStatus({ status: 'unhealthy', error: e.message });
    }
  };

  useEffect(() => {
    checkApiStatus();
  }, []);

  // Handle file selection
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

  // Handle drag and drop
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

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setError(null);
      }
    } catch (err) {
      setError('Camera access denied or not available');
      console.error('Camera error:', err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  // Capture photo from camera
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

  // Make prediction
  const classifyImage = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(`${API}/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Prediction response:', response.data);
      setPrediction(response.data);
    } catch (err: any) {
      console.error('Classification error:', err);
      setError(err.response?.data?.detail || 'Classification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Clear all
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

  // Helper to format feature names for display
  const formatFeatureName = (name: string) => {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <>
      <IonHeader>
        <IonToolbar className="watermelon-gradient">
          <IonTitle className="fw-bold text-dark">Watermelon Classifier</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="bg-light">
        <div className="container py-5">
          {/* Hero Section */}
          <div className="text-center mb-5">
            <h1 className="display-4 fw-bold text-dark mb-3">
              AI-Powered Watermelon Classifier
            </h1>
            <p className="lead text-muted">
              Detect Crimsonsweet F1 variety and ripeness with advanced machine learning
            </p>

            {/* API Status */}
            {apiStatus && (
              <div className="mt-4">
                <span
                  className={`badge rounded-pill px-4 py-2 fs-6 ${
                    apiStatus.status === 'healthy' ? 'bg-success text-white' : 'bg-danger text-white'
                  }`}
                >
                  {apiStatus.status === 'healthy' ? 'API Ready' : 'API Error'}
                  {apiStatus.model_loaded && ' • Model Loaded'}
                </span>
              </div>
            )}
          </div>

          {/* Classification Interface */}
          <div className="mb-5">
            <IonCard className="shadow-sm border-0 rounded-3">
              <IonCardHeader className="watermelon-gradient">
                <IonCardTitle className="text-center text-white fw-bold fs-4">
                  Watermelon Image Classifier
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent className="p-4">
                {/* Image Upload Area */}
                <div
                  className={`file-upload-area border-2 border-dashed rounded-3 p-5 text-center transition-colors ${
                    dragActive ? 'drag-active' : ''
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

                {/* Camera View */}
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

                {/* Error Display */}
                {error && (
                  <IonCard className="mt-4 bg-danger-subtle border border-danger rounded-3">
                    <IonCardContent>
                      <IonText color="danger" className="fs-6">{error}</IonText>
                    </IonCardContent>
                  </IonCard>
                )}

                {/* Prediction Results */}
                {prediction && (
                  <IonCard className="mt-4 shadow-sm border-0 rounded-3">
                    <IonCardHeader>
                      <IonCardTitle className="fw-bold text-dark">Classification Results</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      {/* Main Result */}
                      <IonGrid>
                        <IonRow>
                          <IonCol size="12" size-md="6">
                            <IonCard className="border-0 shadow-sm rounded-3">
                              <IonCardHeader>
                                <IonText className="fw-semibold text-dark">Variety</IonText>
                              </IonCardHeader>
                              <IonCardContent>
                                <IonText
                                  className={`px-3 py-1 rounded-pill text-sm fw-medium ${
                                    prediction.is_crimsonsweet
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
                                  className={`px-3 py-1 rounded-pill text-sm fw-medium ${
                                    prediction.ripeness === 'ripe'
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

                      {/* Confidence */}
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

                      {/* Validation Status */}
                      <IonCard
                        className={`mt-4 ${
                          prediction.is_valid ? 'bg-success-subtle' : 'bg-danger-subtle'
                        } border-0 rounded-3`}
                      >
                        <IonCardContent>
                          <div className="d-flex align-items-center">
                            <IonIcon
                              icon={prediction.is_valid ? checkmarkCircleOutline : closeCircleOutline}
                              className="me-2 fs-5"
                            />
                            <IonText
                              className={prediction.is_valid ? 'text-success' : 'text-danger'}
                            >
                              {prediction.is_valid
                                ? 'Valid watermelon detected'
                                : 'Invalid or unclear image - please try another photo'}
                            </IonText>
                          </div>
                        </IonCardContent>
                      </IonCard>

                      {/* Confidence Breakdown */}
                      <div className="mt-5">
                        <IonText className="fw-semibold text-dark">Confidence Breakdown</IonText>
                        <div className="space-y-3 mt-3">
                          {Object.entries(prediction.confidence_breakdown as { [key: string]: number }).map(([className, confidence]) => (
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
                          ))}
                        </div>
                      </div>

                      {/* Feature Analysis */}
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
                                        {Object.entries(prediction.visual_analysis as { [key: string]: number }).map(([key, value]) => (
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
                                        ))}
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
                                        {Object.entries(prediction.shape_analysis as { [key: string]: number }).map(([key, value]) => (
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
                                        ))}
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
                                        {Object.entries(prediction.surface_analysis as { [key: string]: number }).map(([key, value]) => (
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
                                        ))}
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

          {/* Features */}
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

// ==========================
// App Component
// ==========================
const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/classify">
              <Home />
            </Route>
            <Route exact path="/datasets">
              <DatasetManager />
            </Route>
            <Route exact path="/train">
              <ModelTrainer />
            </Route>
            <Route exact path="/models">
              <ModelManager />
            </Route>
            <Route exact path="/">
              <Redirect to="/classify" />
            </Route>
          </IonRouterOutlet>

          {/* Bootstrap-Inspired Bottom Nav */}
          <IonTabBar slot="bottom" className="shadow-sm border-top bg-white">
            <IonTabButton tab="classify" href="/classify" className="nav-link text-dark">
              <IonIcon aria-hidden="true" icon={homeOutline} className="fs-4" />
              <IonLabel className="fs-6 fw-medium">Classify</IonLabel>
            </IonTabButton>
            <IonTabButton tab="datasets" href="/datasets" className="nav-link text-dark">
              <IonIcon aria-hidden="true" icon={folderOutline} className="fs-4" />
              <IonLabel className="fs-6 fw-medium">Datasets</IonLabel>
            </IonTabButton>
            <IonTabButton tab="train" href="/train" className="nav-link text-dark">
              <IonIcon aria-hidden="true" icon={constructOutline} className="fs-4" />
              <IonLabel className="fs-6 fw-medium">Train</IonLabel>
            </IonTabButton>
            <IonTabButton tab="models" href="/models" className="nav-link text-dark">
              <IonIcon aria-hidden="true" icon={cubeOutline} className="fs-4" />
              <IonLabel className="fs-6 fw-medium">Models</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;