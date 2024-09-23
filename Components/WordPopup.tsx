/*import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Button } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const WordPopup = ({ visible, onClose }: { visible: boolean, onClose: () => void }) => {
    const [word, setWord] = useState<string | null>(null);

    useEffect(() => {
        const fetchWord = async () => {
            const wordDoc = await getDoc(doc(db, 'settings', 'current_word'));

            if (wordDoc.exists()) {
                setWord(wordDoc.data().word);
            }
        };

        if (visible) {
            fetchWord();
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent={true} animationType="slide">
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
                    <Text style={{ fontSize: 20 }}>Today's Word: {word}</Text>
                    <Button title="Close" onPress={onClose} />
                </View>
            </View>
        </Modal>
    );
};

export default WordPopup; */
