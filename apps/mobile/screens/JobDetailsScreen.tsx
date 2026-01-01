import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
    Image,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import axios from 'axios';
import { API_URL } from '../config';
import { format } from 'date-fns';
import { LucideMapPin, LucidePhone, LucideClock, LucideFileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiUpload } from '../lib/sync';

type JobDetailsScreenRouteProp = RouteProp<RootStackParamList, 'JobDetails'>;
type JobDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'JobDetails'>;

interface JobDetail {
    id: string;
    scheduledAt: string;
    status: string;
    description: string;
    property: {
        address: string;
        client: {
            name: string;
            phone: string | null;
            email: string | null;
        };
    };
    notes: { id: string; content: string }[];
    photos: { id: string; url: string; caption: string | null }[];
    products: { product: { name: string; unit: string; type: string }; quantity: number }[];
}

export default function JobDetailsScreen() {
    const navigation = useNavigation<JobDetailsNavigationProp>();
    const route = useRoute<JobDetailsScreenRouteProp>();
    const { jobId } = route.params;

    // Job State
    const [job, setJob] = useState<JobDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Product Usage State
    const [products, setProducts] = useState<any[]>([]);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [quantity, setQuantity] = useState("1");
    const [savingProduct, setSavingProduct] = useState(false);

    // Completion State
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [technicianNotes, setTechnicianNotes] = useState("");
    const [capturedSignature, setCapturedSignature] = useState<string | null>(null);

    const fetchJobDetails = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/jobs/${jobId}`);
            setJob(response.data);
            // Reset state on refresh
            setCapturedSignature(null);
            setTechnicianNotes("");
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch job details');
        } finally {
            setLoading(false);
        }
    };

    // Fetch products for modal
    useEffect(() => {
        axios.get(`${API_URL}/api/products`)
            .then(res => setProducts(res.data))
            .catch(err => console.log('Products fetch error', err));

        // Initial fetch
        fetchJobDetails();
    }, [jobId]);

    const handleAddProduct = async () => {
        if (!selectedProduct || !quantity) return;

        setSavingProduct(true);
        try {
            await axios.post(`${API_URL}/api/jobs/${jobId}/products`, {
                productId: selectedProduct.id,
                quantity: parseFloat(quantity)
            });
            Alert.alert("Success", "Product usage recorded");
            setIsProductModalOpen(false);
            fetchJobDetails(); // Refresh list to show new product
            setQuantity("1");
            setSelectedProduct(null);
        } catch (e) {
            Alert.alert("Error", "Failed to add product");
        } finally {
            setSavingProduct(false);
        }
    };

    const confirmCompletion = async (signature: string | null, isClientUnreachable: boolean) => {
        setUpdating(true);
        // Use provided signature OR pre-captured signature
        const finalSignature = signature || capturedSignature;

        try {
            await axios.post(`${API_URL}/api/jobs/${jobId}/complete`, {
                signature: finalSignature,
                isClientUnreachable,
                notes: technicianNotes
            });
            setJob(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
            setIsCompletionModalOpen(false);
            Alert.alert('Success', 'Job Completed!');
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to complete job. Ensure you signed or marked absent.');
        } finally {
            setUpdating(false);
        }
    };

    const handleTryComplete = () => {
        if (!job) return;

        const hasProducts = job.products.filter(p => (p.product as any).type !== 'SERVICE').length > 0;

        if (!hasProducts) {
            Alert.alert(
                "No Products Recorded",
                "Are you sure you want to proceed without adding materials?",
                [
                    { text: "Add Products", onPress: () => setIsProductModalOpen(true) },
                    { text: "No Products Used", style: "destructive", onPress: () => setIsCompletionModalOpen(true) },
                    { text: "Cancel", style: "cancel" }
                ]
            );
            return;
        }
        setIsCompletionModalOpen(true);
    };

    const updateStatus = async (newStatus: string) => {
        setUpdating(true);
        try {
            await axios.patch(`${API_URL}/api/jobs/${jobId}`, { status: newStatus });
            setJob(prev => prev ? { ...prev, status: newStatus } : null);
            Alert.alert('Success', `Job marked as ${newStatus}`);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Sorry, we need camera permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            uploadPhoto(result.assets[0]);
        }
    };

    const uploadPhoto = async (photoAsset: ImagePicker.ImagePickerAsset) => {
        setUploadingPhoto(true);
        try {
            // Use resilient offline-capable upload
            const response = await apiUpload(
                `${API_URL}/api/jobs/${jobId}/photos`,
                photoAsset,
                'Mobile upload'
            );

            // If we got a real response (online success) or an offline object
            // @ts-ignore
            if (response.ok || response.offline) {
                // If offline, we can't fetch details immediately to see the photo URL
                // unless we fake it in the UI. For now, just re-fetch if online.
                if (!('offline' in response) || !response.offline) {
                    Alert.alert('Success', 'Photo uploaded!');
                    fetchJobDetails();
                }
            } else {
                Alert.alert('Error', 'Upload failed');
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const openMap = () => {
        if (job?.property.address) {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.property.address)}`;
            Linking.openURL(url);
        }
    };

    const callClient = () => {
        if (job?.property.client.phone) {
            Linking.openURL(`tel:${job.property.client.phone}`);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (!job) {
        return (
            <View style={styles.centered}>
                <Text>Job not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* Status Badge */}
                <View style={styles.section}>
                    <Text style={styles.statusLabel}>Status</Text>
                    <View style={[styles.badge,
                    job.status === 'IN_PROGRESS' ? styles.badgeActive :
                        job.status === 'COMPLETED' ? styles.badgeCompleted :
                            job.status === 'EN_ROUTE' ? styles.badgeEnRoute :
                                styles.badgePending
                    ]}>
                        <Text style={[styles.badgeText, job.status === 'EN_ROUTE' && { color: '#B45309' }]}>
                            {job.status === 'EN_ROUTE' ? 'EN ROUTE' : job.status}
                        </Text>
                    </View>
                </View>

                {/* Photos Section */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={styles.sectionTitle}>📷 Photos</Text>
                        <TouchableOpacity onPress={takePhoto} disabled={uploadingPhoto}>
                            {uploadingPhoto ? (
                                <ActivityIndicator size="small" color="#2563eb" />
                            ) : (
                                <Text style={{ color: '#2563eb', fontWeight: 'bold' }}>+ Take Photo</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {job.photos && job.photos.length > 0 ? (
                        <FlatList
                            data={job.photos}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <View style={{ marginRight: 10 }}>
                                    <Image
                                        source={{ uri: `${API_URL}${item.url}` }}
                                        style={{ width: 100, height: 100, borderRadius: 8, backgroundColor: '#eee' }}
                                    />
                                </View>
                            )}
                        />
                    ) : (
                        <Text style={{ color: '#999', fontStyle: 'italic' }}>No photos yet.</Text>
                    )}
                </View>

                {/* Client Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Client Info</Text>
                    <Text style={styles.clientName}>{job.property.client.name}</Text>

                    <TouchableOpacity style={styles.row} onPress={openMap}>
                        <LucideMapPin size={20} color="#666" />
                        <Text style={styles.rowText}>{job.property.address}</Text>
                    </TouchableOpacity>

                    {job.property.client.phone && (
                        <TouchableOpacity style={styles.row} onPress={callClient}>
                            <LucidePhone size={20} color="#666" />
                            <Text style={styles.rowText}>{job.property.client.phone}</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={[styles.actionButton, styles.navigateButton]} onPress={openMap}>
                        <LucideMapPin size={24} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.actionButtonText}>Navigate to Client</Text>
                    </TouchableOpacity>
                </View>

                {/* Job Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Job Details</Text>
                    <View style={styles.row}>
                        <LucideClock size={20} color="#666" />
                        <Text style={styles.rowText}>{format(new Date(job.scheduledAt), 'PPpp')}</Text>
                    </View>
                    <View style={styles.row}>
                        <LucideFileText size={20} color="#666" />
                        <Text style={styles.rowText}>{job.description || 'No description provided.'}</Text>
                    </View>
                </View>

                {/* Services Section */}
                {job.products.filter(p => (p.product as any).type === 'SERVICE').length > 0 && (
                    <View style={[styles.section, { borderLeftWidth: 4, borderLeftColor: '#8B5CF6' }]}>
                        <Text style={styles.sectionTitle}>🛠️ Services Requested</Text>
                        {job.products.filter(p => (p.product as any).type === 'SERVICE').map((p, index) => (
                            <View key={index} style={styles.productRow}>
                                <Text style={[styles.productName, { fontWeight: '700', color: '#8B5CF6' }]}>{p.product.name}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Products/Materials Section with Add Button */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={styles.sectionTitle}>📦 Products & Materials</Text>
                        <TouchableOpacity onPress={() => setIsProductModalOpen(true)}>
                            <Text style={{ color: '#2563eb', fontWeight: 'bold' }}>+ Add</Text>
                        </TouchableOpacity>
                    </View>

                    {job.products.filter(p => (p.product as any).type !== 'SERVICE').length === 0 && (
                        <Text style={{ color: '#999', fontStyle: 'italic' }}>No products recorded yet.</Text>
                    )}

                    {job.products.filter(p => (p.product as any).type !== 'SERVICE').map((p, index) => (
                        <View key={index} style={styles.productRow}>
                            <Text style={styles.productName}>{p.product.name}</Text>
                            <Text style={styles.productQty}>{p.quantity} {p.product.unit}</Text>
                        </View>
                    ))}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    {/* Flow: SCHEDULED -> EN_ROUTE -> IN_PROGRESS -> COMPLETED */}

                    {job.status === 'SCHEDULED' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.enRouteButton]}
                            onPress={() => updateStatus('EN_ROUTE')}
                            disabled={updating}
                        >
                            <Text style={styles.actionButtonText}>Start Travel (En Route)</Text>
                        </TouchableOpacity>
                    )}

                    {(job.status === 'EN_ROUTE' || job.status === 'SCHEDULED') && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.startButton, job.status === 'SCHEDULED' && { opacity: 0.7, marginTop: 10, backgroundColor: '#64748b' }]}
                            onPress={() => updateStatus('IN_PROGRESS')}
                            disabled={updating}
                        >
                            <Text style={styles.actionButtonText}>
                                {job.status === 'EN_ROUTE' ? 'Arrived / Start Job' : 'Skip Travel & Start Job'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {job.status === 'IN_PROGRESS' && (
                        <>
                            {/* NEW: Independent Signature Button */}
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: capturedSignature ? '#dcfce7' : '#fff', borderWidth: 1, borderColor: '#2563eb' }]}
                                onPress={() => navigation.navigate('Signature', {
                                    onOK: (signature: string) => {
                                        setCapturedSignature(signature);
                                        Alert.alert("Signed", "Signature captured temporarily.");
                                    }
                                })}
                                disabled={updating}
                            >
                                <Text style={[styles.actionButtonText, { color: '#2563eb' }]}>
                                    {capturedSignature ? "✅ Signature Captured (Click to Redo)" : "✍️ Capture Signature Only"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, styles.completeButton]}
                                onPress={handleTryComplete}
                                disabled={updating}
                            >
                                <Text style={styles.actionButtonText}>Finish & Complete Report</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => {
                            Alert.alert(
                                "Delete Job",
                                "Are you sure you want to delete this job? This cannot be undone.",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                        text: "Delete",
                                        style: "destructive",
                                        onPress: async () => {
                                            setLoading(true);
                                            try {
                                                const token = await AsyncStorage.getItem('token');
                                                await fetch(`${API_URL}/api/jobs/${job.id}`, {
                                                    method: 'DELETE',
                                                    headers: { 'Authorization': `Bearer ${token}` }
                                                });
                                                navigation.goBack();
                                            } catch (error) {
                                                console.error(error);
                                                Alert.alert("Error", "Failed to delete job");
                                                setLoading(false);
                                            }
                                        }
                                    }
                                ]
                            );
                        }}
                        disabled={loading}
                    >
                        <Text style={[styles.actionButtonText, { color: '#DC2626' }]}>Delete Job</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Product Modal */}
            <Modal visible={isProductModalOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Product Usage</Text>

                        <Text style={styles.label}>Select Product:</Text>
                        <ScrollView style={{ maxHeight: 200, marginBottom: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 8 }}>
                            {products.filter(p => p.type !== 'SERVICE').map(p => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={[styles.option, selectedProduct?.id === p.id && styles.optionSelected]}
                                    onPress={() => setSelectedProduct(p)}
                                >
                                    <Text style={[styles.optionText, selectedProduct?.id === p.id && { color: 'white' }]}>
                                        {p.name} ({p.unit})
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Quantity:</Text>
                        <TextInput
                            style={styles.input}
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="numeric"
                            placeholder="0.0"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsProductModalOpen(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveBtn, (!selectedProduct || savingProduct) && { opacity: 0.5 }]}
                                onPress={handleAddProduct}
                                disabled={!selectedProduct || savingProduct}
                            >
                                <Text style={styles.saveBtnText}>{savingProduct ? "Saving..." : "Add"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Completion Modal */}
            <Modal visible={isCompletionModalOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Complete Job</Text>

                        <Text style={styles.label}>Work Notes / Observations:</Text>
                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                            value={technicianNotes}
                            onChangeText={setTechnicianNotes}
                            placeholder="Describe work done, issues found..."
                            multiline
                        />

                        <Text style={[styles.label, { marginTop: 10 }]}>Confirmation:</Text>
                        <View style={{ gap: 10 }}>
                            {/* If already signed, show simplified Complete button */}
                            {capturedSignature ? (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.completeButton, { marginBottom: 0 }]}
                                    onPress={() => confirmCompletion(null, false)}
                                >
                                    <Text style={styles.actionButtonText}>✅ Complete Job (Signed)</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.completeButton, { marginBottom: 0 }]}
                                    onPress={() => {
                                        setIsCompletionModalOpen(false);
                                        navigation.navigate('Signature', {
                                            onOK: (signature: string) => confirmCompletion(signature, false)
                                        });
                                    }}
                                >
                                    <Text style={styles.actionButtonText}>✍️ Sign & Complete</Text>
                                </TouchableOpacity>
                            )}

                            {!capturedSignature && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#6b7280', marginBottom: 0 }]}
                                    onPress={() => confirmCompletion(null, true)}
                                >
                                    <Text style={styles.actionButtonText}>🚪 Client Not Home</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc' }]}
                                onPress={() => setIsCompletionModalOpen(false)}
                            >
                                <Text style={[styles.actionButtonText, { color: '#666' }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    statusLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#e0e7ff',
    },
    badgeActive: {
        backgroundColor: '#dcfce7',
    },
    badgeCompleted: {
        backgroundColor: '#d1fae5',
    },
    badgeEnRoute: {
        backgroundColor: '#ffedd5',
    },
    badgePending: {
        backgroundColor: '#f3f4f6',
    },
    badgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    clientName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    rowText: {
        fontSize: 16,
        color: '#4b5563',
        marginLeft: 12,
        flex: 1,
    },
    productRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    productName: {
        fontSize: 16,
        color: '#333',
    },
    productQty: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    actions: {
        marginTop: 20,
    },
    actionButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    enRouteButton: {
        backgroundColor: '#f59e0b',
    },
    startButton: {
        backgroundColor: '#2563eb',
    },
    completeButton: {
        backgroundColor: '#16a34a',
    },
    navigateButton: {
        backgroundColor: '#8B5CF6',
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    deleteButton: {
        backgroundColor: '#FEE2E2',
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#FECACA'
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        maxHeight: '80%'
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center'
    },
    label: {
        fontWeight: '600',
        marginBottom: 8,
        color: '#333'
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20
    },
    option: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    optionSelected: {
        backgroundColor: '#2563eb'
    },
    optionText: {
        fontSize: 16
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        alignItems: 'center'
    },
    saveBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        backgroundColor: '#2563eb',
        alignItems: 'center'
    },
    cancelBtnText: {
        color: '#333',
        fontWeight: '600'
    },
    saveBtnText: {
        color: 'white',
        fontWeight: '600'
    }
});
