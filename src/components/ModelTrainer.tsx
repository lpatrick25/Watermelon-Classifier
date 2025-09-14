import React, { useState, useEffect } from 'react';
import {
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonText,
    IonGrid,
    IonRow,
    IonCol,
    IonProgressBar,
    IonSpinner,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonHeader,
    IonToolbar,
    IonTitle,
} from '@ionic/react';
import { informationCircleOutline } from 'ionicons/icons';
import axios from 'axios';
import '../App.css';

const BACKEND_URL = 'http://192.168.100.8:8502';
const API = `${BACKEND_URL}/api`;

interface Dataset {
    name: string;
    classes: string[];
    train_samples: number;
    val_samples: number;
    test_samples: number;
}

interface TrainingStatus {
    is_training: boolean;
    progress: number;
    message: string;
}

const ModelTrainer: React.FC = () => {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [selectedDataset, setSelectedDataset] = useState('');
    const [modelName, setModelName] = useState('');
    const [extension, setExtension] = useState('.keras');
    const [epochs, setEpochs] = useState(15);
    const [loading, setLoading] = useState(false);
    const [trainingStatus, setTrainingStatus] = useState<TrainingStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Load datasets and training status on component mount
    useEffect(() => {
        loadDatasets();
        checkTrainingStatus();

        // Poll training status every 2 seconds when training is active
        const interval = setInterval(() => {
            if (trainingStatus?.is_training) {
                checkTrainingStatus();
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [trainingStatus?.is_training]);

    const loadDatasets = async () => {
        try {
            const response = await axios.get(`${API}/datasets`);
            setDatasets(response.data);
        } catch (err) {
            console.error('Error loading datasets:', err);
            setError('Failed to load datasets');
        }
    };

    const checkTrainingStatus = async () => {
        try {
            const response = await axios.get(`${API}/train/status`);
            setTrainingStatus(response.data);
        } catch (err) {
            console.error('Error checking training status:', err);
        }
    };

    const startTraining = async () => {
        if (!selectedDataset) {
            setError('Please select a dataset');
            return;
        }

        if (!modelName.trim()) {
            setError('Please enter a model name');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        let fullModelName = modelName.trim();
        if (!fullModelName.endsWith('.keras') && !fullModelName.endsWith('.h5')) {
            fullModelName += extension;
        }

        try {
            const response = await axios.post(`${API}/train`, {
                dataset_name: selectedDataset,
                epochs,
                model_name: fullModelName,
            });

            setSuccess('Training started successfully!');
            checkTrainingStatus();
        } catch (err: any) {
            console.error('Training start error:', err);
            setError(err.response?.data?.detail || 'Failed to start training');
        } finally {
            setLoading(false);
        }
    };

    const getSelectedDatasetInfo = () => {
        return datasets.find((d) => d.name === selectedDataset);
    };

    const getProgressColor = (progress: number) => {
        if (progress < 30) return 'danger';
        if (progress < 70) return 'warning';
        return 'success';
    };

    const generateModelName = () => {
        if (selectedDataset) {
            const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
            setModelName(`${selectedDataset}_model_${timestamp}${extension}`);
        }
    };

    return (
        <>
            <IonHeader>
                <IonToolbar className="watermelon-gradient">
                    <IonTitle className="fw-bold text-dark">Watermelon Classifier</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding bg-light">
                <IonCard className="shadow-sm border-0 rounded-3">
                    <IonCardHeader className="watermelon-gradient">
                        <IonCardTitle className="text-center text-white fw-bold fs-4">Model Training</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="p-4">
                        {/* Training Status Card */}
                        {trainingStatus && (
                            <IonCard
                                className={`mb-4 shadow-sm rounded-3 ${trainingStatus.is_training
                                    ? 'bg-info-subtle border border-info'
                                    : trainingStatus.message.includes('completed')
                                        ? 'bg-success-subtle border border-success'
                                        : trainingStatus.message.includes('failed')
                                            ? 'bg-danger-subtle border border-danger'
                                            : 'bg-secondary-subtle border border-secondary'
                                    }`}
                            >
                                <IonCardHeader>
                                    <IonText className="fw-semibold">
                                        {trainingStatus.is_training ? (
                                            <span>
                                                <IonIcon icon={informationCircleOutline} className="me-1 text-info" />
                                                Training in Progress
                                            </span>
                                        ) : (
                                            <>
                                                <IonIcon icon={informationCircleOutline} className="me-1 text-secondary" />
                                                Training Status
                                            </>
                                        )}
                                    </IonText>
                                </IonCardHeader>
                                <IonCardContent className="p-3">
                                    {trainingStatus.is_training && (
                                        <div className="mb-3">
                                            <IonGrid>
                                                <IonRow className="align-items-center">
                                                    <IonCol size="8">
                                                        <IonText className="text-sm fw-medium text-dark">Progress</IonText>
                                                    </IonCol>
                                                    <IonCol size="4" className="text-end">
                                                        <IonText className="text-sm text-dark">{trainingStatus.progress}%</IonText>
                                                    </IonCol>
                                                </IonRow>
                                            </IonGrid>
                                            <IonProgressBar
                                                value={trainingStatus.progress / 100}
                                                color={getProgressColor(trainingStatus.progress)}
                                                className="mt-1"
                                            />
                                        </div>
                                    )}
                                    <IonText
                                        className={`fw-medium ${trainingStatus.is_training
                                            ? 'text-info'
                                            : trainingStatus.message.includes('completed')
                                                ? 'text-success'
                                                : trainingStatus.message.includes('failed')
                                                    ? 'text-danger'
                                                    : 'text-secondary'
                                            }`}
                                    >
                                        {trainingStatus.message}
                                    </IonText>
                                    {trainingStatus.is_training && (
                                        <div className="mt-3 d-flex align-items-center text-sm text-info">
                                            <IonSpinner name="crescent" className="me-2" />
                                            <IonText>
                                                Training is running in the background. You can leave this page and return later.
                                            </IonText>
                                        </div>
                                    )}
                                </IonCardContent>
                            </IonCard>
                        )}

                        {/* Training Configuration */}
                        <IonCard className="mb-5 shadow-sm border-0 rounded-3">
                            <IonCardHeader>
                                <IonText className="fw-semibold text-dark">Configure Training</IonText>
                            </IonCardHeader>
                            <IonCardContent>
                                {/* Dataset Selection */}
                                <IonList lines="none">
                                    <IonItem>
                                        <IonLabel position="stacked" className="text-sm text-dark">
                                            Select Dataset
                                        </IonLabel>
                                        <IonSelect
                                            value={selectedDataset}
                                            onIonChange={(e) => {
                                                const newValue = e.detail.value;
                                                setSelectedDataset(newValue);
                                                if (!modelName.trim() && newValue) {
                                                    generateModelName();
                                                }
                                            }}
                                            disabled={trainingStatus?.is_training}
                                            className="w-100"
                                            placeholder="Choose a dataset..."
                                        >
                                            <IonSelectOption value="">Choose a dataset...</IonSelectOption>
                                            {datasets.map((dataset) => (
                                                <IonSelectOption key={dataset.name} value={dataset.name}>
                                                    {dataset.name} ({dataset.train_samples + dataset.val_samples + dataset.test_samples} images)
                                                </IonSelectOption>
                                            ))}
                                        </IonSelect>
                                    </IonItem>
                                </IonList>

                                {/* Dataset Info */}
                                {selectedDataset && getSelectedDatasetInfo() && (
                                    <IonCard className="mt-4 bg-info-subtle border-0 rounded-3">
                                        <IonCardHeader>
                                            <IonText className="fw-semibold text-info">Dataset Information</IonText>
                                        </IonCardHeader>
                                        <IonCardContent>
                                            <IonGrid>
                                                <IonRow className="g-2">
                                                    <IonCol size="12" size-md="6">
                                                        <IonText className="text-sm text-info-emphasis">
                                                            <strong>Classes:</strong> {getSelectedDatasetInfo()?.classes?.join(', ') ?? 'N/A'}
                                                        </IonText>
                                                    </IonCol>
                                                    <IonCol size="12" size-md="6">
                                                        <IonText className="text-sm text-info-emphasis">
                                                            <strong>Training samples:</strong> {getSelectedDatasetInfo()?.train_samples ?? 'N/A'}
                                                        </IonText>
                                                    </IonCol>
                                                    <IonCol size="12" size-md="6">
                                                        <IonText className="text-sm text-info-emphasis">
                                                            <strong>Validation samples:</strong> {getSelectedDatasetInfo()?.val_samples ?? 'N/A'}
                                                        </IonText>
                                                    </IonCol>
                                                    <IonCol size="12" size-md="6">
                                                        <IonText className="text-sm text-info-emphasis">
                                                            <strong>Test samples:</strong> {getSelectedDatasetInfo()?.test_samples ?? 'N/A'}
                                                        </IonText>
                                                    </IonCol>
                                                </IonRow>
                                            </IonGrid>
                                        </IonCardContent>
                                    </IonCard>
                                )}

                                {/* Model Name */}
                                <IonList lines="none" className="mt-4">
                                    <IonItem>
                                        <IonLabel position="stacked" className="text-sm text-dark">
                                            Model Name
                                        </IonLabel>
                                        <IonGrid>
                                            <IonRow className="align-items-center">
                                                <IonCol size="7">
                                                    <IonInput
                                                        type="text"
                                                        value={modelName}
                                                        onIonChange={(e) => setModelName(e.detail.value!)}
                                                        placeholder="Enter model name..."
                                                        disabled={trainingStatus?.is_training}
                                                        className="w-100"
                                                    />
                                                </IonCol>
                                                <IonCol size="2">
                                                    <IonSelect
                                                        value={extension}
                                                        onIonChange={(e) => setExtension(e.detail.value)}
                                                        disabled={trainingStatus?.is_training}
                                                        className="w-100"
                                                    >
                                                        <IonSelectOption value=".keras">.keras</IonSelectOption>
                                                        <IonSelectOption value=".h5">.h5</IonSelectOption>
                                                    </IonSelect>
                                                </IonCol>
                                                <IonCol size="3" className="text-end">
                                                    <IonButton
                                                        onClick={generateModelName}
                                                        disabled={!selectedDataset || trainingStatus?.is_training}
                                                        size="small"
                                                        fill="outline"
                                                        color="info"
                                                        className="hover:bg-info-subtle transition-colors duration-200"
                                                    >
                                                        Generate
                                                    </IonButton>
                                                </IonCol>
                                            </IonRow>
                                        </IonGrid>
                                    </IonItem>
                                </IonList>

                                {/* Epochs */}
                                <IonList lines="none" className="mt-4">
                                    <IonItem>
                                        <IonLabel position="stacked" className="text-sm text-dark">
                                            Training Epochs
                                        </IonLabel>
                                        <IonInput
                                            type="number"
                                            value={epochs}
                                            onIonChange={(e) =>
                                                setEpochs(Math.max(1, Math.min(100, parseInt(e.detail.value!) || 15)))
                                            }
                                            min="1"
                                            max="100"
                                            disabled={trainingStatus?.is_training}
                                            className="w-100"
                                        />
                                        <IonText color="medium" className="text-sm mt-1">
                                            More epochs = better training but takes longer (recommended: 10-30)
                                        </IonText>
                                    </IonItem>
                                </IonList>

                                {/* Start Training Button */}
                                <IonButton
                                    onClick={startTraining}
                                    disabled={loading || trainingStatus?.is_training || !selectedDataset || !modelName.trim()}
                                    expand="block"
                                    className="mt-4 hover:bg-success-subtle transition-colors duration-200"
                                    color="success"
                                >
                                    {loading ? (
                                        <IonSpinner name="crescent" />
                                    ) : trainingStatus?.is_training ? (
                                        'Training in Progress...'
                                    ) : (
                                        'Start Training'
                                    )}
                                </IonButton>
                            </IonCardContent>
                        </IonCard>

                        {/* Status Messages */}
                        {error && (
                            <IonCard className="mb-4 bg-danger-subtle border border-danger rounded-3">
                                <IonCardContent>
                                    <IonText color="danger" className="fs-6">{error}</IonText>
                                </IonCardContent>
                            </IonCard>
                        )}

                        {success && (
                            <IonCard className="mb-4 bg-success-subtle border border-success rounded-3">
                                <IonCardContent>
                                    <IonText color="success" className="fs-6">{success}</IonText>
                                </IonCardContent>
                            </IonCard>
                        )}

                        {/* Training Information */}
                        <IonCard className="mt-5 bg-warning-subtle border-0 rounded-3">
                            <IonCardHeader>
                                <IonText className="fw-semibold text-warning">
                                    <IonIcon icon={informationCircleOutline} className="me-2" />
                                    Training Information
                                </IonText>
                            </IonCardHeader>
                            <IonCardContent>
                                <IonList lines="none">
                                    <IonItem>
                                        <IonLabel className="text-sm text-warning-emphasis">
                                            <strong>What happens during training:</strong>
                                            <ul className="list-disc ml-4 mt-1 space-y-1">
                                                <li>The AI model learns to recognize watermelon features</li>
                                                <li>It's trained to classify both variety (Crimsonsweet F1 vs others) and ripeness</li>
                                                <li>The model uses transfer learning from MobileNetV2 for better accuracy</li>
                                                <li>Training data is automatically balanced to handle class imbalances</li>
                                            </ul>
                                        </IonLabel>
                                    </IonItem>
                                    <IonItem>
                                        <IonLabel className="text-sm text-warning-emphasis">
                                            <strong>Training time estimates:</strong>
                                            <ul className="list-disc ml-4 mt-1 space-y-1">
                                                <li>Small dataset (&lt; 500 images): 5-15 minutes</li>
                                                <li>Medium dataset (500-2000 images): 15-45 minutes</li>
                                                <li>Large dataset (&gt; 2000 images): 45+ minutes</li>
                                            </ul>
                                        </IonLabel>
                                    </IonItem>
                                    <IonItem>
                                        <IonLabel className="text-sm text-warning-emphasis">
                                            <strong>After training:</strong>
                                            <ul className="list-disc ml-4 mt-1 space-y-1">
                                                <li>Your model will be automatically saved</li>
                                                <li>You can load and use it for classification</li>
                                                <li>Export to TensorFlow Lite for mobile deployment</li>
                                                <li>Evaluate performance on test data</li>
                                            </ul>
                                        </IonLabel>
                                    </IonItem>
                                </IonList>
                            </IonCardContent>
                        </IonCard>
                    </IonCardContent>
                </IonCard>
            </IonContent>
        </>
    );
};

export default ModelTrainer;