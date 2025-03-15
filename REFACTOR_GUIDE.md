# แนวทางการ Refactor โค้ด

เอกสารนี้เป็นแนวทางสำหรับการ refactor โค้ดในโปรเจค Summary of Personnel Ratio เพื่อปรับปรุงคุณภาพโค้ดและประสิทธิภาพการทำงาน

## หลักการทั่วไป

1. **แยกความรับผิดชอบ** - แต่ละคอมโพเนนต์ควรมีหน้าที่เดียวที่ชัดเจน
2. **ลดการซ้ำซ้อน** - แยกโค้ดที่ใช้ซ้ำเป็น utility functions หรือ custom hooks
3. **ปรับปรุงประสิทธิภาพ** - ใช้ React.memo, useMemo, useCallback เมื่อเหมาะสม
4. **เพิ่ม Type Safety** - ใช้ TypeScript type definitions ให้ครบถ้วน

## ส่วนที่ควรปรับปรุง

### 1. แยกการเรียก Firebase API

```javascript
// BAD: Firestore calls mixed with UI logic
function Component() {
  const handleSubmit = async () => {
    const db = getFirestore();
    await addDoc(collection(db, 'data'), { /* data */ });
    // UI logic...
  }
}

// GOOD: Separate Firebase logic into services
// services/firebaseService.js
export async function saveData(data) {
  const db = getFirestore();
  return await addDoc(collection(db, 'data'), data);
}

// Component.js
function Component() {
  const handleSubmit = async () => {
    await saveData({ /* data */ });
    // UI logic...
  }
}
```

### 2. จัดการ Form State

แก้ไขการจัดการ state ของฟอร์มโดยใช้ Reducer หรือ Form Library:

```javascript
// BEFORE: Multiple useState calls
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [phone, setPhone] = useState('');

// AFTER: Using useReducer
const [formState, dispatch] = useReducer(formReducer, initialState);

function formReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    default:
      return state;
  }
}
```

### 3. แยกการแสดงผลและ Logic

```javascript
// BEFORE: Mixed concerns
function Component() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await fetch('/api/data');
        const json = await result.json();
        setData(json);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  
  return (
    <div>
      {loading ? <Loading /> : <DataTable data={data} />}
    </div>
  );
}

// AFTER: Custom hook for data fetching logic
function useData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await fetch('/api/data');
        const json = await result.json();
        setData(json);
      } catch (error) {
        console.error(error);
        setError(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  
  return { data, loading, error };
}

// Component just handles presentation
function Component() {
  const { data, loading, error } = useData();
  
  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  
  return <DataTable data={data} />;
}
```

## แนวปฏิบัติที่ดีในการเขียนโค้ด

1. ตั้งชื่อให้มีความหมาย
2. เขียนความคิดเห็นที่มีประโยชน์
3. ใช้ const เมื่อค่าไม่เปลี่ยนแปลง
4. ควบคุมความซับซ้อนของฟังก์ชัน
5. เขียนเทสให้ครอบคลุม
6. ใช้ linter และ code formatter

## การ Refactor ค่อยเป็นค่อยไป

ไม่จำเป็นต้อง refactor ทั้งหมดในครั้งเดียว สามารถทำทีละส่วนและทดสอบให้มั่นใจว่าทุกอย่างยังทำงานได้ตามปกติ
