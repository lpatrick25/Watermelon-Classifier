import React, { useState, useEffect, useRef } from 'react';
import {
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonSpinner,
    IonText,
    IonGrid,
    IonRow,
    IonCol,
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

const DatasetManager: React.FC = () => {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load datasets on component mount
    useEffect(() => {
        loadDatasets();
    }, []);

    const loadDatasets = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/datasets`);
            setDatasets(response.data);
            setError(null);
        } catch (err) {
            console.error('Error loading datasets:', err);
            setError('Failed to load datasets');
        } finally {
            setLoading(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            uploadDataset(files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadDataset(file);
        }
    };

    const uploadDataset = async (file: File) => {
        if (!file.name.endsWith('.zip')) {
            setError('Please select a ZIP file containing your dataset');
            return;
        }

        setUploading(true);
        setError(null);
        setSuccess(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('dataset_name', file.name.replace('.zip', ''));

            const response = await axios.post(`${API}/dataset/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setSuccess(`Dataset "${file.name}" uploaded successfully!`);
            loadDatasets(); // Refresh dataset list

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.response?.data?.detail || 'Failed to upload dataset');
        } finally {
            setUploading(false);
        }
    };

    const formatClassList = (classes: string[] | undefined) => {
        if (!classes || classes.length === 0) return 'No classes';
        return classes.join(', ');
    };

    const getTotalSamples = (dataset: Dataset) => {
        return dataset.train_samples + dataset.val_samples + dataset.test_samples;
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
                        <IonCardTitle className="text-center text-white fw-bold fs-4">Dataset Management</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent className="p-4">
                        {/* Upload Section */}
                        <IonCard className="mb-5 shadow-sm border-0 rounded-3">
                            <IonCardHeader>
                                <IonText className="fw-semibold text-dark">Upload New Dataset</IonText>
                            </IonCardHeader>
                            <IonCardContent>
                                <div
                                    className={`file-upload-area border-2 border-dashed rounded-3 p-5 text-center transition-colors ${dragActive ? 'drag-active' : ''
                                        }`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <IonIcon icon={informationCircleOutline} className="text-success fs-1 mb-4" />
                                    <IonText color="medium">
                                        <p className="fs-5">Drag and drop your dataset ZIP file here</p>
                                        <p className="text-sm">Dataset should contain images organized in folders by class</p>
                                    </IonText>
                                    <IonButton
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        color="success"
                                        className="mt-4"
                                    >
                                        {uploading ? <IonSpinner name="crescent" /> : 'Choose File'}
                                    </IonButton>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".zip"
                                    onChange={handleFileSelect}
                                    className="d-none"
                                />

                                {/* Dataset Structure Info */}
                                <IonCard className="mt-4 bg-info-subtle border-0 rounded-3">
                                    <IonCardHeader>
                                        <IonText className="fw-semibold text-info">Expected Dataset Structure:</IonText>
                                    </IonCardHeader>
                                    <IonCardContent>
                                        <pre className="text-sm text-info-emphasis">
                                            {`dataset.zip
├── crimsonsweet_ripe/
│   ├── image1.jpg
│   ├── image2.jpg
│   └── ...
├── crimsonsweet_unripe/
│   ├── image1.jpg
│   └── ...
├── other_variety/
│   └── ...
└── not_valid/
    └── ...`}
                                        </pre>
                                        <IonText color="info" className="text-sm mt-2">
                                            The system will automatically split your data into train/validation/test sets (70/20/10)
                                        </IonText>
                                    </IonCardContent>
                                </IonCard>
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

                        {/* Datasets List */}
                        <IonCard className="shadow-sm border-0 rounded-3">
                            <IonCardHeader>
                                <IonGrid>
                                    <IonRow className="align-items-center">
                                        <IonCol size="8">
                                            <IonText className="fw-semibold text-dark">Available Datasets</IonText>
                                        </IonCol>
                                        <IonCol size="4" className="text-end">
                                            <IonButton onClick={loadDatasets} disabled={loading} size="small" color="success">
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
                                            Loading datasets...
                                        </IonText>
                                    </div>
                                ) : datasets.length === 0 ? (
                                    <div className="text-center py-5">
                                        <IonIcon icon={informationCircleOutline} className="text-success fs-1 mb-4" />
                                        <IonText color="medium">
                                            No datasets found. Upload your first dataset to get started!
                                        </IonText>
                                    </div>
                                ) : (
                                    <IonGrid>
                                        <IonRow>
                                            {datasets.map((dataset, index) => (
                                                <IonCol size="12" size-md="6" size-lg="4" key={index}>
                                                    <IonCard
                                                        className="border-0 shadow-sm rounded-3 transition-all duration-200 hover:shadow-md"
                                                        style={{ minHeight: '100%' }}
                                                    >
                                                        <IonCardHeader className="p-3 bg-light border-bottom border-gray-200">
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <IonText className="fw-semibold text-dark text-truncate" style={{ maxWidth: '70%' }}>
                                                                    {dataset.name.length > 20 ? `${dataset.name.substring(0, 20)}...` : dataset.name}
                                                                </IonText>
                                                                <IonText className="text-xs bg-info-subtle text-info px-2 py-1 rounded-pill">
                                                                    Dataset
                                                                </IonText>
                                                            </div>
                                                        </IonCardHeader>
                                                        <IonCardContent className="p-3">
                                                            <IonList lines="none" className="mb-3">
                                                                <IonItem>
                                                                    <IonLabel className="text-sm text-dark">
                                                                        <strong>Classes:</strong>
                                                                        <p className="text-xs text-muted mt-1 break-words">
                                                                            {formatClassList(dataset.classes) || 'No classes'}
                                                                        </p>
                                                                    </IonLabel>
                                                                </IonItem>
                                                                <IonItem>
                                                                    <IonGrid>
                                                                        <IonRow className="g-2">
                                                                            <IonCol size="6" className="p-1">
                                                                                <IonText className="text-xs text-dark">
                                                                                    <strong>Train:</strong> {dataset.train_samples}
                                                                                </IonText>
                                                                            </IonCol>
                                                                            <IonCol size="6" className="p-1">
                                                                                <IonText className="text-xs text-dark">
                                                                                    <strong>Val:</strong> {dataset.val_samples}
                                                                                </IonText>
                                                                            </IonCol>
                                                                            <IonCol size="6" className="p-1">
                                                                                <IonText className="text-xs text-dark">
                                                                                    <strong>Test:</strong> {dataset.test_samples}
                                                                                </IonText>
                                                                            </IonCol>
                                                                            <IonCol size="6" className="p-1">
                                                                                <IonText className="text-xs text-success">
                                                                                    <strong>Total:</strong> {getTotalSamples(dataset)}
                                                                                </IonText>
                                                                            </IonCol>
                                                                        </IonRow>
                                                                    </IonGrid>
                                                                </IonItem>
                                                            </IonList>
                                                            <div className="mt-3 pt-2 border-top border-gray-300">
                                                                <IonGrid>
                                                                    <IonRow className="align-items-center">
                                                                        <IonCol size="6">
                                                                            <IonText className="text-xs text-muted">
                                                                                {dataset.classes?.length || 0} classes
                                                                            </IonText>
                                                                        </IonCol>
                                                                        <IonCol size="6" className="text-end">
                                                                            <IonButton
                                                                                fill="outline"
                                                                                color="success"
                                                                                size="small"
                                                                                className="text-success hover:bg-success-subtle transition-colors duration-200"
                                                                                title="View detailed dataset information"
                                                                            >
                                                                                View Details
                                                                            </IonButton>
                                                                        </IonCol>
                                                                    </IonRow>
                                                                </IonGrid>
                                                            </div>
                                                        </IonCardContent>
                                                    </IonCard>
                                                </IonCol>
                                            ))}
                                        </IonRow>
                                    </IonGrid>
                                )}
                            </IonCardContent>
                        </IonCard>

                        {/* Instructions */}
                        <IonCard className="mt-5 bg-warning-subtle border-0 rounded-3">
                            <IonCardHeader>
                                <IonText className="fw-semibold text-warning">
                                    <IonIcon icon={informationCircleOutline} className="me-2" />
                                    Tips for Better Results
                                </IonText>
                            </IonCardHeader>
                            <IonCardContent>
                                <IonList lines="none">
                                    <IonItem>
                                        <IonText className="text-sm text-warning-emphasis">
                                            Ensure images are clear and well-lit
                                        </IonText>
                                    </IonItem>
                                    <IonItem>
                                        <IonText className="text-sm text-warning-emphasis">
                                            Include diverse angles and backgrounds
                                        </IonText>
                                    </IonItem>
                                    <IonItem>
                                        <IonText className="text-sm text-warning-emphasis">
                                            Have at least 50+ images per class for good training
                                        </IonText>
                                    </IonItem>
                                    <IonItem>
                                        <IonText className="text-sm text-warning-emphasis">
                                            Use consistent image quality across all classes
                                        </IonText>
                                    </IonItem>
                                    <IonItem>
                                        <IonText className="text-sm text-warning-emphasis">
                                            Include both ripe and unripe examples for Crimsonsweet F1
                                        </IonText>
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

export default DatasetManager;