import React, { useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
  Text,
} from "react-native";
import { IconButton } from "react-native-paper";

const { width } = Dimensions.get("window");

const PostImages = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);

  // Extraer URLs de las imágenes (compatibilidad con ambas estructuras)
  const getImageUrls = () => {
    if (!images || images.length === 0) return [];

    return images.map((img) => {
      // Si es un objeto con propiedad 'url', usar esa
      if (typeof img === "object" && img.url) {
        return img.url;
      }
      // Si es un string (URL directa), usarlo
      return img;
    });
  };

  const imageUrls = getImageUrls();

  if (imageUrls.length === 0) {
    return null;
  }

  const openImage = (index) => {
    setSelectedImage(imageUrls[index]);
    setImageIndex(index);
  };

  const closeImage = () => {
    setSelectedImage(null);
  };

  const goToNext = () => {
    if (imageIndex < imageUrls.length - 1) {
      setImageIndex(imageIndex + 1);
      setSelectedImage(imageUrls[imageIndex + 1]);
    }
  };

  const goToPrev = () => {
    if (imageIndex > 0) {
      setImageIndex(imageIndex - 1);
      setSelectedImage(imageUrls[imageIndex - 1]);
    }
  };

  // Para una sola imagen
  if (imageUrls.length === 1) {
    return (
      <View style={styles.singleContainer}>
        <TouchableOpacity onPress={() => openImage(0)}>
          <Image
            source={{ uri: imageUrls[0] }}
            style={styles.singleImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Para múltiples imágenes
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {imageUrls.map((imageUrl, index) => (
          <TouchableOpacity
            key={index}
            style={styles.imageWrapper}
            onPress={() => openImage(index)}
          >
            <Image
              source={{ uri: imageUrl }}
              style={styles.multiImage}
              resizeMode="cover"
            />
            {/* Indicador de múltiples imágenes */}
            {index === 2 && imageUrls.length > 3 && (
              <View style={styles.moreOverlay}>
                <View style={styles.moreBadge}>
                  <IconButton
                    icon="image-multiple"
                    size={20}
                    iconColor="#ffffff"
                  />
                  <Text style={styles.moreText}>+{imageUrls.length - 3}</Text>
                </View>
              </View>
            )}
            {index > 2 && <View style={styles.hidden} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal para ver imagen en pantalla completa */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        onRequestClose={closeImage}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={closeImage}
          >
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />

            {/* Botones de navegación si hay múltiples imágenes */}
            {imageUrls.length > 1 && (
              <>
                {imageIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.prevButton]}
                    onPress={goToPrev}
                  >
                    <IconButton
                      icon="chevron-left"
                      size={30}
                      iconColor="#ffffff"
                    />
                  </TouchableOpacity>
                )}

                {imageIndex < imageUrls.length - 1 && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.nextButton]}
                    onPress={goToNext}
                  >
                    <IconButton
                      icon="chevron-right"
                      size={30}
                      iconColor="#ffffff"
                    />
                  </TouchableOpacity>
                )}

                {/* Contador de imágenes */}
                <View style={styles.counterBadge}>
                  <Text style={styles.counterText}>
                    {imageIndex + 1} / {imageUrls.length}
                  </Text>
                </View>
              </>
            )}

            {/* Botón de cerrar */}
            <TouchableOpacity style={styles.closeButton} onPress={closeImage}>
              <IconButton icon="close" size={24} iconColor="#ffffff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  singleContainer: {
    marginVertical: 8,
  },
  singleImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
  },
  scrollContent: {
    paddingRight: 16,
  },
  imageWrapper: {
    marginRight: 8,
    position: "relative",
  },
  multiImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  moreBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  moreText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: -8,
  },
  hidden: {
    display: "none",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackground: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: width,
    height: width,
  },
  navButton: {
    position: "absolute",
    top: "50%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 25,
    padding: 8,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
  },
  counterBadge: {
    position: "absolute",
    bottom: 50,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default PostImages;
