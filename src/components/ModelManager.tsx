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
    IonText,
    IonGrid,
    IonRow,
    IonCol,
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
    test_samples: number;
}

interface Model {
    name: string;
    format: string;
    size_mb: number;
    class_names?: string[];
    confidence_threshold?: number;
}

interface EvaluationResults {
    modelName: string;
    datasetName: string;
    accuracy: number;
    num_test_samples: number;
    classification_report: { [key: string]: { precision: number; recall: number; 'f1-score': number; support: number } };
    confusion_matrix: number[][];
}

const ModelManager: React.FC = () => {
    const [models, setModels] = useState<Model[]>([]);
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [evaluationResults, setEvaluationResults] = useState<EvaluationResults | null>(null);
    const [evaluatingModel, setEvaluatingModel] = useState<string | null>(null);

    useEffect(() => {
        loadModels();
        loadDatasets();
    }, []);

    const loadModels = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/models`);
            setModels(response.data);
            setError(null);
        } catch (err) {
            console.error('Error loading models:', err);
            setError('Failed to load models');
        } finally {
            setLoading(false);
        }
    };

    const loadDatasets = async () => {
        try {
            const response = await axios.get(`${API}/datasets`);
            setDatasets(response.data);
        } catch (err) {
            console.error('Error loading datasets:', err);
        }
    };

    const loadModel = async (modelName: string) => {
        try {
            setError(null);
            const response = await axios.post(`${API}/models/${modelName}/load`);
            setSuccess(`Model "${modelName}" loaded successfully and ready for use!`);
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            console.error('Error loading model:', err);
            setError(err.response?.data?.detail || 'Failed to load model');
        }
    };

    const evaluateModel = async (modelName: string, datasetName: string) => {
        setEvaluatingModel(modelName);
        setError(null);
        setEvaluationResults(null);

        try {
            const response = await axios.post(`${API}/models/${modelName}/evaluate?dataset_name=${datasetName}`);
            setEvaluationResults({
                modelName,
                datasetName,
                ...response.data,
            });
        } catch (err: any) {
            console.error('Error evaluating model:', err);
            setError(err.response?.data?.detail || 'Failed to evaluate model');
        } finally {
            setEvaluatingModel(null);
        }
    };

    const exportToTFLite = async (modelName: string) => {
        try {
            setError(null);
            const response = await axios.post(`${API}/models/${modelName}/export/tflite`);
            setSuccess(`Model "${modelName}" exported to TensorFlow Lite successfully!`);
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            console.error('Error exporting model:', err);
            setError(err.response?.data?.detail || 'Failed to export model');
        }
    };

    const formatSize = (sizeInMB: number) => {
        if (sizeInMB < 1) {
            return `${(sizeInMB * 1024).toFixed(1)} KB`;
        } else if (sizeInMB > 1024) {
            return `${(sizeInMB / 1024).toFixed(1)} GB`;
        } else {
            return `${sizeInMB.toFixed(1)} MB`;
        }
    };

    const getAccuracyColor = (accuracy: number) => {
        if (accuracy >= 0.9) return 'success';
        if (accuracy >= 0.8) return 'warning';
        return 'danger';
    };

    return (
        <>
            <IonHeader>
                <IonToolbar className="watermelon-gradient">
                    <IonTitle className="fw-bold text-dark fs-4">Watermelon Classifier</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding bg-light">
                <IonCard className="shadow-sm border-0 rounded-3">
                    <IonCardHeader className="watermelon-gradient">
                        <IonCardTitle className="text-center text-white fw-bold fs-4">Model Management</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="p-4">
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

                        {/* Models List */}
                        <IonCard className="mb-5 shadow-sm border-0 rounded-3">
                            <IonCardHeader>
                                <IonGrid>
                                    <IonRow className="align-items-center">
                                        <IonCol size="8">
                                            <IonText className="fw-semibold text-dark fs-5">Trained Models</IonText>
                                        </IonCol>
                                        <IonCol size="4" className="text-end">
                                            <IonButton
                                                onClick={loadModels}
                                                disabled={loading}
                                                size="small"
                                                color="success"
                                                className="hover:bg-success-subtle transition-colors duration-200"
                                            >
                                                {loading ? <IonSpinner name="crescent" /> : 'Refresh'}
                                            </IonButton>
                                        </IonCol>
                                    </IonRow>
                                </IonGrid>
                            </IonCardHeader>
                            <IonCardContent>
                                {loading ? (
                                    <div className="text-center py-5">
                                        <IonSpinner name="crescent" />
                                        <IonText color="medium" className="block mt-2 fs-6">
                                            Loading models...
                                        </IonText>
                                    </div>
                                ) : models.length === 0 ? (
                                    <div className="text-center py-5">
                                        <IonIcon icon={informationCircleOutline} className="text-success fs-2 mb-3" />
                                        <IonText color="medium" className="fs-5">
                                            No trained models found. Train your first model to get started!
                                        </IonText>
                                        <IonText color="medium" className="block mt-2 text-sm">
                                            Go to the "Train Model" section to create your watermelon classifier.
                                        </IonText>
                                    </div>
                                ) : (
                                    <IonList lines="none">
                                        {models.map((model, index) => (
                                            <IonItem key={index} className="border-0 rounded-3 mb-4 p-0">
                                                <IonCard className="w-100">
                                                    <IonCardContent className="p-3">
                                                        <IonGrid>
                                                            <IonRow className="align-items-center">
                                                                <IonCol size="12" size-md="8">
                                                                    <IonText className="fw-semibold text-dark fs-5 text-truncate">
                                                                        {model.name}
                                                                    </IonText>
                                                                    <IonGrid className="mt-2">
                                                                        <IonRow className="g-2">
                                                                            <IonCol size="auto">
                                                                                <IonText
                                                                                    className={`px-2 py-1 rounded-pill text-xs fw-medium ${model.format === 'SavedModel'
                                                                                            ? 'bg-info-subtle text-info'
                                                                                            : 'bg-purple-100 text-purple-800'
                                                                                        }`}
                                                                                >
                                                                                    {model.format}
                                                                                </IonText>
                                                                            </IonCol>
                                                                            <IonCol size="auto">
                                                                                <IonText className="text-sm text-muted">
                                                                                    Size: {formatSize(model.size_mb)}
                                                                                </IonText>
                                                                            </IonCol>
                                                                            {model.class_names && (
                                                                                <IonCol size="auto">
                                                                                    <IonText className="text-sm text-muted">
                                                                                        Classes: {model.class_names.length}
                                                                                    </IonText>
                                                                                </IonCol>
                                                                            )}
                                                                        </IonRow>
                                                                    </IonGrid>
                                                                </IonCol>
                                                                <IonCol size="12" size-md="4" className="text-end">
                                                                    <IonButton
                                                                        onClick={() => loadModel(model.name)}
                                                                        size="small"
                                                                        color="success"
                                                                        className="me-2 hover:bg-success-subtle transition-colors duration-200"
                                                                    >
                                                                        Load for Use
                                                                    </IonButton>
                                                                    <IonButton
                                                                        onClick={() => exportToTFLite(model.name)}
                                                                        size="small"
                                                                        color="primary"
                                                                        className="hover:bg-primary-subtle transition-colors duration-200"
                                                                    >
                                                                        Export TFLite
                                                                    </IonButton>
                                                                </IonCol>
                                                            </IonRow>

                                                            {/* Model Details */}
                                                            {model.class_names && (
                                                                <IonRow className="mt-4 bg-light-subtle rounded-2 p-2">
                                                                    <IonCol>
                                                                        <IonText className="fw-medium text-dark fs-6">Model Details</IonText>
                                                                        <IonGrid className="mt-2">
                                                                            <IonRow>
                                                                                <IonCol size="12" size-md="6">
                                                                                    <IonText className="text-sm text-muted">
                                                                                        <strong>Classes:</strong> {model.class_names.join(', ')}
                                                                                    </IonText>
                                                                                </IonCol>
                                                                                {model.confidence_threshold && (
                                                                                    <IonCol size="12" size-md="6">
                                                                                        <IonText className="text-sm text-muted">
                                                                                            <strong>Confidence Threshold:</strong> {model.confidence_threshold}
                                                                                        </IonText>
                                                                                    </IonCol>
                                                                                )}
                                                                            </IonRow>
                                                                        </IonGrid>
                                                                    </IonCol>
                                                                </IonRow>
                                                            )}

                                                            {/* Evaluation Section */}
                                                            <IonRow className="mt-4 pt-3 border-top border-gray-200">
                                                                <IonCol>
                                                                    <IonText className="fw-medium text-dark fs-6">Model Evaluation</IonText>
                                                                    <IonGrid className="mt-2">
                                                                        <IonRow className="align-items-center">
                                                                            <IonCol size="12" size-md="6">
                                                                                <IonSelect
                                                                                    onIonChange={(e) => {
                                                                                        if (e.detail.value) {
                                                                                            evaluateModel(model.name, e.detail.value);
                                                                                        }
                                                                                    }}
                                                                                    disabled={evaluatingModel === model.name}
                                                                                    placeholder="Select dataset to evaluate..."
                                                                                    className="w-100"
                                                                                >
                                                                                    <IonSelectOption value="">Select dataset to evaluate...</IonSelectOption>
                                                                                    {datasets.map((dataset) => (
                                                                                        <IonSelectOption key={dataset.name} value={dataset.name}>
                                                                                            {dataset.name} ({dataset.test_samples} test samples)
                                                                                        </IonSelectOption>
                                                                                    ))}
                                                                                </IonSelect>
                                                                            </IonCol>
                                                                            <IonCol size="12" size-md="6" className="text-end">
                                                                                {evaluatingModel === model.name && (
                                                                                    <div className="d-flex align-items-center text-sm text-info">
                                                                                        <IonSpinner name="crescent" className="me-2" />
                                                                                        <IonText>Evaluating...</IonText>
                                                                                    </div>
                                                                                )}
                                                                            </IonCol>
                                                                        </IonRow>
                                                                    </IonGrid>
                                                                </IonCol>
                                                            </IonRow>
                                                        </IonGrid>
                                                    </IonCardContent>
                                                </IonCard>
                                            </IonItem>
                                        ))}
                                    </IonList>
                                )}
                            </IonCardContent>
                        </IonCard>

                        {/* Evaluation Results */}
                        {evaluationResults && (
                            <IonCard className="shadow-sm border-0 rounded-3">
                                <IonCardHeader className="watermelon-gradient">
                                    <IonCardTitle className="text-white fw-bold fs-4">
                                        Evaluation Results: {evaluationResults.modelName}
                                    </IonCardTitle>
                                </IonCardHeader>
                                <IonCardContent className="p-4">
                                    <IonText className="text-sm text-muted mb-3">
                                        Evaluated on dataset: <strong>{evaluationResults.datasetName}</strong>
                                        <span className="ms-3">Test samples: {evaluationResults.num_test_samples}</span>
                                    </IonText>
                                    <div className="d-flex align-items-center mb-3">
                                        <IonText className="fw-medium text-dark me-3 fs-5">Overall Accuracy:</IonText>
                                        <IonText
                                            className={`fs-2 fw-bold text-${getAccuracyColor(evaluationResults.accuracy)}`}
                                        >
                                            {(evaluationResults.accuracy * 100).toFixed(1)}%
                                        </IonText>
                                    </div>

                                    {/* Classification Report */}
                                    {evaluationResults.classification_report && (
                                        <div className="mt-4">
                                            <IonText className="fw-semibold text-dark fs-6">Per-Class Performance</IonText>
                                            <IonGrid className="mt-2">
                                                <IonRow className="bg-gray-100 border border-gray-200 rounded-top">
                                                    <IonCol className="p-2 text-sm fw-medium text-dark">Class</IonCol>
                                                    <IonCol className="p-2 text-sm fw-medium text-dark">Precision</IonCol>
                                                    <IonCol className="p-2 text-sm fw-medium text-dark">Recall</IonCol>
                                                    <IonCol className="p-2 text-sm fw-medium text-dark">F1-Score</IonCol>
                                                    <IonCol className="p-2 text-sm fw-medium text-dark">Support</IonCol>
                                                </IonRow>
                                                {Object.entries(evaluationResults.classification_report)
                                                    .filter(([key]) => !['accuracy', 'macro avg', 'weighted avg'].includes(key))
                                                    .map(([className, metrics]) => (
                                                        <IonRow key={className} className="border-t border-gray-200">
                                                            <IonCol className="p-2 text-sm fw-medium capitalize">
                                                                {className.replace('_', ' ')}
                                                            </IonCol>
                                                            <IonCol className="p-2 text-sm text-muted">
                                                                {(metrics.precision * 100).toFixed(1)}%
                                                            </IonCol>
                                                            <IonCol className="p-2 text-sm text-muted">
                                                                {(metrics.recall * 100).toFixed(1)}%
                                                            </IonCol>
                                                            <IonCol className="p-2 text-sm text-muted">
                                                                {(metrics['f1-score'] * 100).toFixed(1)}%
                                                            </IonCol>
                                                            <IonCol className="p-2 text-sm text-muted">{metrics.support}</IonCol>
                                                        </IonRow>
                                                    ))}
                                            </IonGrid>
                                        </div>
                                    )}

                                    {/* Confusion Matrix */}
                                    {evaluationResults.confusion_matrix && (
                                        <div className="mt-4">
                                            <IonText className="fw-semibold text-dark fs-6">Confusion Matrix</IonText>
                                            <IonText color="medium" className="text-sm block mb-2">
                                                Rows: Actual classes, Columns: Predicted classes
                                            </IonText>
                                            <IonGrid className="border border-gray-200 rounded-2">
                                                <IonRow className="bg-gray-100">
                                                    <IonCol className="p-2 text-sm fw-medium text-dark">
                                                        Actual \ Predicted
                                                    </IonCol>
                                                    {evaluationResults.confusion_matrix[0].map((_, colIndex) => (
                                                        <IonCol
                                                            key={colIndex}
                                                            className="p-2 text-sm fw-medium text-dark text-center"
                                                        >
                                                            Class {colIndex}
                                                        </IonCol>
                                                    ))}
                                                </IonRow>
                                                {evaluationResults.confusion_matrix.map((row, rowIndex) => (
                                                    <IonRow key={rowIndex} className="border-t border-gray-200">
                                                        <IonCol className="p-2 text-sm fw-medium text-dark bg-gray-50">
                                                            Class {rowIndex}
                                                        </IonCol>
                                                        {row.map((value, colIndex) => (
                                                            <IonCol
                                                                key={colIndex}
                                                                className={`p-2 text-sm text-center ${rowIndex === colIndex
                                                                        ? 'bg-success-subtle text-success fw-medium'
                                                                        : value > 0
                                                                            ? 'bg-danger-subtle text-danger'
                                                                            : 'text-muted'
                                                                    }`}
                                                            >
                                                                {value}
                                                            </IonCol>
                                                        ))}
                                                    </IonRow>
                                                ))}
                                            </IonGrid>
                                        </div>
                                    )}
                                    <IonButton
                                        onClick={() => setEvaluationResults(null)}
                                        expand="block"
                                        color="medium"
                                        className="mt-4 hover:bg-secondary-subtle transition-colors duration-200"
                                    >
                                        Close Results
                                    </IonButton>
                                </IonCardContent>
                            </IonCard>
                        )}

                        {/* Model Usage Instructions */}
                        <IonCard className="mt-5 bg-warning-subtle border-0 rounded-3">
                            <IonCardHeader>
                                <IonText className="fw-semibold text-warning fs-5">
                                    <IonIcon icon={informationCircleOutline} className="me-2" />
                                    How to Use Your Models
                                </IonText>
                            </IonCardHeader>
                            <IonCardContent>
                                <IonList lines="none">
                                    <IonItem>
                                        <IonLabel className="text-sm text-warning-emphasis">
                                            <strong>Loading a Model:</strong>
                                            <p className="mt-1">Click "Load for Use" to make a model active for classification. Only one model can be active at a time.</p>
                                        </IonLabel>
                                    </IonItem>
                                    <IonItem>
                                        <IonLabel className="text-sm text-warning-emphasis">
                                            <strong>Model Evaluation:</strong>
                                            <p className="mt-1">Select a test dataset to evaluate model performance. This shows accuracy, precision, recall, and confusion matrix.</p>
                                        </IonLabel>
                                    </IonItem>
                                    <IonItem>
                                        <IonLabel className="text-sm text-warning-emphasis">
                                            <strong>TensorFlow Lite Export:</strong>
                                            <p className="mt-1">Export models to TFLite format for mobile deployment. The .tflite file will be optimized for mobile devices.</p>
                                        </IonLabel>
                                    </IonItem>
                                    <IonItem>
                                        <IonLabel className="text-sm text-warning-emphasis">
                                            <strong>Performance Tips:</strong>
                                            <ul className="list-disc ml-4 mt-1 space-y-1">
                                                <li>Accuracy above 90% is excellent</li>
                                                <li>Accuracy 80-90% is good for most applications</li>
                                                <li>Below 80% may need more training data or longer training</li>
                                                <li>Check per-class performance for class-specific issues</li>
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

export default ModelManager;