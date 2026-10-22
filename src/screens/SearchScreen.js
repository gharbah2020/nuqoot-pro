import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import db from '../Database';

export default function SearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }

    try {
      const list = await db.getAllAsync(
        `SELECT 
           person_name,
           SUM(CASE WHEN type = 'give' THEN amount ELSE 0 END) as total_given,
           SUM(CASE WHEN type = 'receive' THEN amount ELSE 0 END) as total_received,
           COUNT(*) as transaction_count
         FROM records
         WHERE LOWER(person_name) LIKE LOWER(?)
         GROUP BY LOWER(person_name)
         ORDER BY person_name ASC`,
        [`%${text.trim()}%`]
      );
      setResults(list);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const renderPersonItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('PersonDetail', { personName: item.person_name })
      }
    >
      <View style={styles.cardHeader}>
        <Text style={styles.personName}>{item.person_name}</Text>
        <Text style={styles.countText}>{item.transaction_count} حركة</Text>
      </View>

      <View style={styles.statsRow}>
        <Text style={[styles.statText, { color: '#D32F2F' }]}>
          له: {item.total_given.toLocaleString()} د.أ
        </Text>
        <Text style={[styles.statText, { color: '#2E7D32' }]}>
          عليه: {item.total_received.toLocaleString()} د.أ
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#888" style={{ marginLeft: 8 }} />
        <TextInput
          style={styles.input}
          placeholder="ابحث باسم الشخص..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.person_name}
        renderItem={renderPersonItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          searchQuery.trim() ? (
            <Text style={styles.emptyText}>لا توجد نتائج مطابقة</Text>
          ) : (
            <Text style={styles.emptyText}>اكتب اسماً في خانة البحث لعرض الحسابات</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    elevation: 2,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  listContainer: {
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  countText: {
    fontSize: 12,
    color: '#777',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
    fontSize: 15,
  },
});
