import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Control, useWatch } from "react-hook-form";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ImagePickerInputProps {
    control: Control<any>;
    name: string;
    error?: string,
    maxImages?: number;
    disabled?: boolean;
    setValue: (name: any, value: any) => void;
}

export default function ImagePickerInput({
    control,
    name,
    error,
    setValue,
    maxImages = 4,
    disabled = false
}: ImagePickerInputProps) {
    const images = (useWatch({
        control,
        name,
    }) as string[]) || [];

    const removeImage = (index: number) => {
        const newImages = images.filter((_: any, i: number) => i !== index);
        setValue(name, newImages);
    };

    const addImage = (image: string) => {
        const newImages = [...images, image];
        setValue(name, newImages);
    };

    const pickImage = async () => {
        if (images.length >= maxImages) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            // aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
            addImage(result.assets[0].uri);
        }
    };

    return (
        <>
            <View style={styles.container}>
                <Text className="font-poppins-bold text-base text-primary mb-3 ml-[5%]">Product Images</Text>

                {/* Display selected images */}
                {images?.map((image: string, index: number) => (
                    <View key={`image-${image}-${index}`} style={styles.imageContainer}>
                        <Image source={{ uri: image }} style={styles.image} />
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => removeImage(index)}
                            disabled={disabled}
                        >
                            <Ionicons name="close-circle" size={24} color="#ff4444" />
                        </TouchableOpacity>
                    </View>
                ))}

                {/* Add image button */}
                {images.length < maxImages && (
                    <TouchableOpacity
                        className="bg-input"
                        style={styles.addButton}
                        onPress={pickImage}
                        disabled={disabled}
                    >
                        <Ionicons name="add" size={32} color="#666" />
                        <Text style={styles.addButtonText}>Add Image</Text>
                    </TouchableOpacity>
                )}

                <Text className="ml-[5%] font-poppins-light text-gray-500 text-xs mt-2" >
                    {images.length}/{maxImages} images selected
                </Text>
            </View>
            {error && <Text className="text-status-error ml-[5%] text-sm font-poppins">{error}</Text>}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 10,
        color: "#333",
    },
    imageContainer: {
        position: "relative",
        marginBottom: 10,
    },
    image: {
        width: "90%",
        height: 200,
        borderRadius: 10,
        alignSelf: "center",
    },
    deleteButton: {
        position: "absolute",
        top: 10,
        right: "8%",
        backgroundColor: "white",
        borderRadius: 12,
        padding: 2,
    },
    addButton: {
        width: "90%",
        height: 200,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#aaa",
        borderStyle: "dashed",
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        // backgroundColor: "#f9f9f9",
    },
    addButtonText: {
        marginTop: 8,
        fontSize: 16,
        color: "#666",
    },
    helperText: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
        marginTop: 5,
    },
});


// import { Ionicons } from "@expo/vector-icons";

// import * as ImagePicker from "expo-image-picker";
// import React from "react";
// import { Control, useWatch } from "react-hook-form";
// import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// interface ImagePickerInputProps {
//     control: Control<any>;
//     name: string;
//     error?: string,
//     maxImages?: number;
//     disabled?: boolean;
//     setValue: (name: string, value: any) => void;
// }

// export default function ImagePickerInput({
//     control,
//     name,
//     error,
//     setValue,
//     maxImages = 4,
//     disabled = false
// }: ImagePickerInputProps) {
//     // const { fields, append, remove } = useFieldArray({
//     //     control,
//     //     name,
//     // });

//     const images = useWatch({
//         control,
//         name,
//         defaultValue: []
//     }) || [];

//     const removeImage = (index: number) => {
//         const newImages = images.filter((_: any, i: number) => i !== index);
//         setValue(name, newImages);

//     };

//     const addImage = (image: string) => {
//         const newImage = [...images, image];
//         setValue(name, image);
//     };

//     const pickImage = async () => {
//         if (images.length >= maxImages) return;

//         const result = await ImagePicker.launchImageLibraryAsync({
//             mediaTypes: ['images'],
//             allowsEditing: true,
//             aspect: [4, 3],
//             quality: 0.8,
//         });

//         if (!result.canceled && result.assets[0]) {
//             // append({name: result.assets[0].uri});
//             addImage(result.assets[0].uri)
//         }
//     };

//     // const removeImage = (index: number) => {
//     //     remove(index);
//     // };

//     console.log(images)

//     return (
//         <>
//             <View style={styles.container}>
//                 <Text className="font-poppins-bold text-base text-primary mb-3 ml-[5%]">Product Images</Text>

//                 {/* Display selected images */}
//                 {images?.map((image: string, index: number) => (
//                     <View key={`image-${image}-${index}`} style={styles.imageContainer}>
//                         <Image source={{ uri: image }} style={styles.image} />
//                         <TouchableOpacity
//                             style={styles.deleteButton}
//                             onPress={() => removeImage(index)}
//                             disabled={disabled}
//                         >
//                             <Ionicons name="close-circle" size={24} color="#ff4444" />
//                         </TouchableOpacity>
//                     </View>
//                 ))}

//                 {/* Add image button */}
//                 {images.length < maxImages && (
//                     <TouchableOpacity
//                         className="bg-input"
//                         style={styles.addButton}
//                         onPress={pickImage}
//                         disabled={disabled}
//                     >
//                         <Ionicons name="add" size={32} color="#666" />
//                         <Text style={styles.addButtonText}>Add Image</Text>
//                     </TouchableOpacity>
//                 )}

//                 <Text className="ml-[5%] font-poppins-light text-gray-500 text-xs mt-2" >
//                     {images.length}/{maxImages} images selected
//                 </Text>
//             </View>
//             {error && <Text className="text-status-error ml-[5%] text-sm font-poppins">{error}</Text>}
//         </>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         marginVertical: 10,
//     },
//     label: {
//         fontSize: 16,
//         fontWeight: "600",
//         marginBottom: 10,
//         color: "#333",
//     },
//     imageContainer: {
//         position: "relative",
//         marginBottom: 10,
//     },
//     image: {
//         width: "90%",
//         height: 200,
//         borderRadius: 10,
//         alignSelf: "center",
//     },
//     deleteButton: {
//         position: "absolute",
//         top: 10,
//         right: "8%",
//         backgroundColor: "white",
//         borderRadius: 12,
//         padding: 2,
//     },
//     addButton: {
//         width: "90%",
//         height: 200,
//         borderWidth: StyleSheet.hairlineWidth,
//         borderColor: "#aaa",
//         borderStyle: "dashed",
//         borderRadius: 10,
//         justifyContent: "center",
//         alignItems: "center",
//         alignSelf: "center",
//         // backgroundColor: "#f9f9f9",
//     },
//     addButtonText: {
//         marginTop: 8,
//         fontSize: 16,
//         color: "#666",
//     },
//     helperText: {
//         fontSize: 12,
//         color: "#666",
//         textAlign: "center",
//         marginTop: 5,
//     },
// }); 