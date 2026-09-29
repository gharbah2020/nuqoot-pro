import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { EVENT_TYPES } from '../config/constants';

export const generateId = () => uuidv4();

export const getEventType = (typeId) =>
  EVENT_TYPES.find(t => t.id === typeId) || EVENT_TYPES[EVENT_TYPES.length - 1];

export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });
  } catch { return dateString; }
};

export const formatDateShort = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return dateString; }
};

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0';
  return Number(amount).toLocaleString('ar-EG');
};

export const getDirectionInfo = (direction) => ({
  label: direction === 'incoming' ? 'نقوط ليّا (واردة) 📥' : 'نقوط عليّا (صادرة) 📤',
  color: direction === 'incoming' ? '#2E7D32' : '#C62828',
  bg: direction === 'incoming' ? '#E8F5E9' : '#FFEBEE',
});

export const getCurrentDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};