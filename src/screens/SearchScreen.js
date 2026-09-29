import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchPeople, getPersonHistory } from '../database/LocalDB';
import { formatCurrency, formatDateShort, getEventType } from '../utils/helpers';
import { COLORS } from '../utils/theme';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);

  const handleSearch = async (text) => {
    setQuery(text);
    setSelected(null);
    if (text.trim().length >= 1) {
      setResults(await searchPeople(text.trim()));
    } else {
      setResults([]);
    }
  };

  const handleSelect = async (person) => {
    setSelected(person);
    setHistory(await getPersonHistory(person.person_name));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔍 بحث عن شخص وسجلّه</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleSearch}
          placeholder="اكتب اسم الشخص للبحث..."
          textAlign="right"
          autoFocus
        />
      </View>

      {selected ? (
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
            <Text style={styles.backT}>الرجوع لنتائج البحث</Text>
          </TouchableOpacity>

          <View style={styles.personHeader}>
            <Text style={styles.personName}>{selected.person_name}</Text>
            {selected.phone ? <Text style={styles.personPhone}>📱 {selected.phone}</Text> : null}
            <View style={styles.statsRow}>
              <View style={[styles.stat, { backgroundColor: COLORS.incomingLight }]}>
                <Text style={styles.statL}>إجمالي الوارد (منه)</Text>
                <Text style={[styles.statV, { color: COLORS.incoming }]}>{formatCurrency(selected.total_received)} ج.م</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: COLORS.outgoingLight }]}>
                <Text style={styles.statL}>إجمالي الصادر (له)</Text>
                <Text style={[styles.statV, { color: COLORS.outgoing }]}>{formatCurrency(selected.total_given)} ج.م</Text>
              </View>
            </View>
          </View>

          <Text style={styles.secT}>تاريخ المناسبات المشتركة</Text>
          <FlatList
            data={history}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const type = getEventType(item.event_type);
              const isInc = item.direction === 'incoming';
              return (
                <View style={styles.histItem}>
                  <Text style={[styles.histAmt, { color: isInc ? COLORS.incoming : COLORS.outgoing }]}>
                    {isInc ? '+' : '-'}{formatCurrency(item.amount)} ج.م
                  </Text>
                  <View style={{ alignItems: 'flex-end', flex: 1, marginRight: 10 }}>
                    <Text style={styles.histEv}>{type.icon} {item.event_name}</Text>
                    <Text style={styles.histDate}>{formatDateShort(item.event_date)}</Text>
                  </View>
                </View>
              );
            }}
          />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.person_name}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.resBal, { color: (item.total_received - item.total_given) >= 0 ? COLORS.incoming : COLORS.outgoing }]}>
                  {formatCurrency(item.total_received - item.total_given)} ج.م
                </Text>
                <Text style={{ fontSize: 10, color: '#888' }}>الصافي</Text>
              </View>
              <View style={{ flex: 1, marginRight: 12, alignItems: 'flex-end' }}>
                <Text style={styles.resName}>{item.person_name}</Text>
                <Text style={styles.resSub}>وارد: {formatCurrency(item.total_received)} | صادر: {formatCurrency(item.total_given)}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            query.length > 0 ? (
              <Text style={styles.empty}>لا توجد نتائج مطابقة لـ "{query}"</Text>
            ) : (
              <Text style={styles.empty}>ابحث باسم أي شخص لمعرفة إجمالي ما لك وما عليك معه</Text>
            )
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingTop: 45, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  searchBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', margin: 16, paddingHorizontal: 14, borderRadius: 12, elevation: 2 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, marginRight: 8 },
  resultItem: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 4, padding: 14, borderRadius: 12, elevation: 1, alignItems: 'center' },
  resName: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  resSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  resBal: { fontSize: 14, fontWeight: 'bold' },
  backBtn: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  backT: { color: COLORS.primary, fontSize: 13, fontWeight: 'bold', marginRight: 6 },
  personHeader: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 16, alignItems: 'center', elevation: 2 },
  personName: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  personPhone: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row-reverse', marginTop: 12, width: '100%' },
  stat: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', marginHorizontal: 4 },
  statL: { fontSize: 11, color: COLORS.textSecondary },
  statV: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  secT: { fontSize: 14, fontWeight: 'bold', textAlign: 'right', paddingHorizontal: 16, marginBottom: 6, color: COLORS.text },
  histItem: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 4, padding: 12, borderRadius: 10, elevation: 1, alignItems: 'center' },
  histEv: { fontSize: 13, fontWeight: 'bold', color: COLORS.text },
  histDate: { fontSize: 11, color: COLORS.textHint, marginTop: 2 },
  histAmt: { fontSize: 14, fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40, paddingHorizontal: 20 },
});

export default SearchScreen;