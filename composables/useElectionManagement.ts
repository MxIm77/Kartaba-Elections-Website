// composables/useElectionManagement.ts
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { navigateTo } from '#app'; // Import for navigation

// --- Configuration ---
const useSampleData = ref(true); // <<< Using Sample Data by default
const itemsPerPage = 50; // You can adjust how many items per page
// ---

// --- Interfaces ---
interface Voter {
  id: number | string;
  register: number | string;
  family: string;
  name: string;
  father: string;
  mother: string;
  dob: string;
  sex: string;
  religion: string;
  elected: 'Yes' | 'No' | '';
  isUpdating?: boolean;
  updateStatus?: 'success' | 'error' | null;
}

interface DistrictOption {
    value: string;
    text: string;
}

// --- Sample Data Definition (7 Entries) ---
const sampleDistricts: DistrictOption[] = [
    { value: 'district_south', text: 'قرطبا الجنوبية' },
    { value: 'district_north', text: 'قرطبا الشمالية' },
];

const sampleRegisters: { [key: string]: (number | string)[] } = {
    district_south: [1, 3, 5, 6, 11, 12, 13],
    district_north: [101, 105, 110], // Added sample registers for North
};

const sampleVoters: Voter[] = [
    { id: 670, register: 1, family: 'صوايا', name: 'انطوان', father: 'جورج', mother: 'ناديا ضومط', dob: '22/2/1984', sex: 'الذكور', religion: 'روم كاثوليك', elected: 'Yes' },
    { id: 1765, register: 1, family: 'صوايا', name: 'جورج', father: 'صوايا', mother: 'منى صوايا', dob: '5/12/1950', sex: 'الذكور', religion: 'روم كاثوليك', elected: '' },
    { id: 184, register: 1, family: 'ضومط', name: 'ناديا', father: 'عزيز', mother: 'متيل جرجس', dob: '20/1/1946', sex: 'الإناث', religion: 'روم كاثوليك', elected: 'No' },
    { id: 180, register: 3, family: 'خانجي', name: 'ديانا ماري', father: 'جورج', mother: 'سلوى', dob: '29/5/1952', sex: 'الإناث', religion: 'روم كاثوليك', elected: '' },
    { id: 2181, register: 3, family: 'صوايا', name: 'برندات', father: 'فريد', mother: 'نجيبه بو رعد', dob: '15/8/1948', sex: 'الإناث', religion: 'روم كاثوليك', elected: 'Yes' },
    { id: 874, register: 3, family: 'صوايا', name: 'جورج', father: 'نعيم', mother: 'اميره صوايا', dob: '30/4/1937', sex: 'الذكور', religion: 'روم كاثوليك', elected: '' },
    { id: 693, register: 5, family: 'سعد', name: 'محبوبه', father: 'بولس', mother: 'قمر', dob: '1936', sex: 'الإناث', religion: 'روم كاثوليك', elected: 'Yes' },
];

// --- Composable Logic ---
export function useElectionManagement() {
  const router = useRouter();

  const voters = ref<Voter[]>([]);
  const loadingVoters = ref(true);
  const errorVoters = ref<string | null>(null);
  const districtOptions = ref<DistrictOption[]>([]);
  const registerOptions = ref<(number | string)[]>([]);
  const loadingRegisters = ref(false);
  const selectedDistrict = ref('');
  const selectedRegister = ref('');
  const selectedSex = ref('');
  const currentPage = ref(1);
  const totalPages = ref(1);
  const message = ref('');
  const isError = ref(false);
  let messageTimeout: ReturnType<typeof setTimeout> | null = null;

  const showMessage = (msg: string, error = false, duration = 3000) => {
    message.value = msg;
    isError.value = error;
    if (messageTimeout) clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => { message.value = ''; isError.value = false; }, duration);
  };

  const fetchInitialData = async () => {
    loadingVoters.value = true;
    errorVoters.value = null;
    if (!useSampleData.value) {
        // --- REAL API LOGIC ---
        try {
            const { data: districtData, error: districtError } = await useFetch<{ districts: DistrictOption[] }>('/api/election/districts');
            if (districtError.value || !districtData.value) throw new Error(districtError.value?.data?.message || 'Failed to fetch districts');
            districtOptions.value = districtData.value.districts;
            if (districtOptions.value.length > 0) {
                selectedDistrict.value = districtOptions.value[0].value;
                await fetchRegisters(); await fetchVoters();
            } else { loadingVoters.value = false; voters.value = []; totalPages.value = 1; currentPage.value = 1; }
        } catch (err: any) {
            console.error("Initialization error:", err); errorVoters.value = err.message || 'Failed initial data.';
            showMessage(errorVoters.value!, true); loadingVoters.value = false; voters.value = []; totalPages.value = 1; currentPage.value = 1;
        }
    } else {
        // --- SAMPLE DATA LOGIC ---
        console.log("Using Sample Data Mode"); await new Promise(resolve => setTimeout(resolve, 50)); // Minimal delay
        districtOptions.value = sampleDistricts;
        if (districtOptions.value.length > 0) { selectedDistrict.value = districtOptions.value[0].value; await fetchRegisters(); await fetchVoters(); }
        else { loadingVoters.value = false; voters.value = []; totalPages.value = 1; currentPage.value = 1; }
    }
  };

  const fetchRegisters = async () => {
    if (!selectedDistrict.value) { registerOptions.value = []; selectedRegister.value = ''; return; }
    loadingRegisters.value = true;
    if (!useSampleData.value) { /* Real API Logic */ }
    else {
        // --- SAMPLE DATA ---
        await new Promise(resolve => setTimeout(resolve, 50));
        registerOptions.value = sampleRegisters[selectedDistrict.value]?.sort((a, b) => Number(a) - Number(b)) || [];
        loadingRegisters.value = false;
    }
  };

  const fetchVoters = async () => {
    loadingVoters.value = true; errorVoters.value = null;
    if (!useSampleData.value) { /* Real API Logic */ }
    else {
        // --- SAMPLE DATA ---
        await new Promise(resolve => setTimeout(resolve, 100));
        let filteredVoters = sampleVoters.filter(voter => {
            const districtMatch = !selectedDistrict.value ||
                (selectedDistrict.value === 'district_south' && sampleRegisters['district_south']?.includes(Number(voter.register))) ||
                (selectedDistrict.value === 'district_north' && sampleRegisters['district_north']?.includes(Number(voter.register)));
            const registerMatch = !selectedRegister.value || voter.register.toString() === selectedRegister.value;
            const sexMatch = !selectedSex.value || voter.sex === selectedSex.value;
            return districtMatch && registerMatch && sexMatch;
        });
        const totalSamplePages = Math.ceil(filteredVoters.length / itemsPerPage);
        totalPages.value = totalSamplePages > 0 ? totalSamplePages : 1;
        if (currentPage.value > totalPages.value) currentPage.value = totalPages.value;
        const startIndex = (currentPage.value - 1) * itemsPerPage; const endIndex = startIndex + itemsPerPage;
        voters.value = filteredVoters.slice(startIndex, endIndex).map(v => ({ ...v, isUpdating: false, updateStatus: null }));
        loadingVoters.value = false;
    }
  };

  const handleElectedChange = async (voterId: number | string, newValue: 'Yes' | 'No' | '') => {
    const voterIndex = voters.value.findIndex(v => v.id === voterId); if (voterIndex === -1) return;
    const voter = voters.value[voterIndex]; const originalValue = voter.elected;
    voter.isUpdating = true; voter.elected = newValue; voter.updateStatus = null;
    if (!useSampleData.value) { /* Real API Logic */ }
    else {
        // --- SAMPLE DATA ---
        await new Promise(resolve => setTimeout(resolve, 200));
        const originalVoterIndex = sampleVoters.findIndex(v => v.id === voterId);
        if (originalVoterIndex !== -1) { sampleVoters[originalVoterIndex].elected = newValue; }
        voter.updateStatus = 'success'; console.log(`Sample Update: Voter ${voterId} status changed to ${newValue}`);
        voter.isUpdating = false; setTimeout(() => { voter.updateStatus = null; }, 2000);
    }
  };

  const changePage = (newPage: number) => {
    if (loadingVoters.value) return;
    if (newPage >= 1 && newPage <= totalPages.value && newPage !== currentPage.value) { currentPage.value = newPage; }
  };

  const handleLogout = async () => {
    console.log("Logging out..."); if (!useSampleData.value) { /* Real API Logic */ }
    else { console.log("Simulating logout"); }
    localStorage.removeItem('currentUser'); await navigateTo('/');
  };

  // --- Watchers ---
  watch([selectedDistrict, selectedRegister, selectedSex], ([nd, nr, ns], [od, or, os]) => {
      if (nd !== od || nr !== or || ns !== os) { if (currentPage.value !== 1) { currentPage.value = 1; } else { fetchVoters(); } }
  });
  watch(currentPage, (np, op) => { if (np !== op) { fetchVoters(); } });
  watch(selectedDistrict, (nd, od) => { if (nd !== od && od !== undefined) { selectedRegister.value = ''; fetchRegisters(); } });
  onMounted(fetchInitialData);

  return { // Return all state and methods needed by the component
    voters, loadingVoters, errorVoters, districtOptions, registerOptions, loadingRegisters, selectedDistrict,
    selectedRegister, selectedSex, currentPage, totalPages, message, isError, itemsPerPage,
    handleElectedChange, changePage, handleLogout,
  };
}