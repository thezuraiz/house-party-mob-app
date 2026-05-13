import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';


interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    icon?: string;
    iconColor?: string;
    confirmColor?: string;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function ConfirmModal({
    visible,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    icon = 'trash',
    iconColor = '#EF4444',
    confirmColor = '#EF4444',
    onCancel,
    onConfirm,
}: ConfirmModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <Pressable
                style={styles.overlay}
                onPress={onCancel}
            >
                <Pressable
                    style={styles.box}
                    onPress={(e: any) =>
                        e.stopPropagation()
                    }
                >
                    <View
                        style={[
                            styles.iconCircle,
                            {
                                backgroundColor:
                                    'rgba(239,68,68,0.12)',
                            },
                        ]}
                    >
                        <Ionicons
                            // @ts-ignore
                            name={icon}
                            size={32}
                            color={iconColor}
                        />
                    </View>

                    <Text style={styles.title}>
                        {title}
                    </Text>

                    <Text style={styles.message}>
                        {message}
                    </Text>

                    <View style={styles.btnRow}>
                        <Pressable
                            style={styles.cancelBtn}
                            onPress={onCancel}
                        >
                            <Text style={styles.cancelTxt}>
                                {cancelText}
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.confirmBtn,
                                {
                                    backgroundColor:
                                        confirmColor,
                                },
                            ]}
                            onPress={onConfirm}
                        >
                            <Ionicons
                                name="trash-outline"
                                size={16}
                                color="#FFFFFF"
                            />

                            <Text style={styles.confirmTxt}>
                                {confirmText}
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },

    box: {
        backgroundColor: '#111111',
        borderRadius: 24,
        padding: 28,
        width: '100%',
        alignItems: 'center',
        gap: 12,

        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',

        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 16,
    },

    iconCircle: {
        width: 68,
        height: 68,
        borderRadius: 34,

        justifyContent: 'center',
        alignItems: 'center',

        marginBottom: 4,
    },

    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.3,
        textAlign: 'center',
    },

    message: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.55)',
        textAlign: 'center',
        lineHeight: 22,
    },

    btnRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
        width: '100%',
    },

    cancelBtn: {
        flex: 1,
        backgroundColor: '#1A1A1A',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',

        borderWidth: 1,
        borderColor:
            'rgba(255,255,255,0.1)',
    },

    cancelTxt: {
        fontSize: 15,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
    },

    confirmBtn: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 14,

        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },

    confirmTxt: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});