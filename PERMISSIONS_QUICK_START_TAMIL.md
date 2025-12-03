# Dynamic Permission System - Quick Start (தமிழில்)

## 🎯 என்ன செய்யப்பட்டுள்ளது?

இப்போது HRM Portal-ல் மூன்று-நிலை dynamic permission system உள்ளது:

1. **Sidebar Menu Visibility** - எந்த menus sidebar-ல் காட்டப்படும் என்பதை control செய்யலாம்
2. **Page Access Control** - எந்த pages-க்கு access உள்ளது என்பதை control செய்யலாம்
3. **Action Permissions** - என்ன actions (view, create, edit, delete, approve, export) செய்யலாம் என்பதை control செய்யலாம்

## ✨ முக்கிய Features

- ✅ **Dynamic Sidebar Menus**: Role-க்கு ஏற்ப sidebar menus மாறும்
- ✅ **Page Protection**: Permission இல்லாத pages-க்கு access தடுக்கப்படும்
- ✅ **Fine-grained Permissions**: ஒவ்வொரு action-க்கும் permission set செய்யலாம்
- ✅ **Admin Full Access**: Admin-க்கு எல்லாமே access உள்ளது
- ✅ **Real-time Updates**: Role assign செய்தவுடன் permissions apply ஆகும்

## 🚀 எப்படி Use செய்வது?

### புதிய Role Create செய்வது

1. **Roles & Access page-க்கு போகவும்** (`/dashboard/roles`)

2. **"Create Role" button-ஐ click செய்யவும்**

3. **Tab 1: Basic Info**
   - Role Name: உதாரணம் "HR Manager", "Team Lead"
   - Description: Role-ன் விவரம்

4. **Tab 2: Sidebar Menus**
   - இந்த role-க்கு எந்த menus sidebar-ல் தெரியணும் என்று select செய்யவும்
   - "Select All" button-ஐ use செய்து எல்லாவற்றையும் ஒரே நேரத்தில் select செய்யலாம்
   
   **உதாரணம்**: HR Manager-க்கு:
   - ✅ Dashboard
   - ✅ Employees
   - ✅ Attendance
   - ✅ Leave
   - ✅ Payroll
   - ❌ Projects
   - ❌ Security
   - ❌ Settings

5. **Tab 3: Page Access**
   - இந்த role-க்கு எந்த pages-க்கு access உள்ளது என்று select செய்யவும்
   - ⚠️ **முக்கியம்**: Sidebar-ல் visible ஆன menus-க்கு page access-ம் give செய்யவும்
   
   **உதாரணம்**: 
   - "Employees" menu visible ஆனால், "employees" page access கொடுக்கவும்
   - இல்லாவிட்டால் menu click செய்யும்போது error வரும்

6. **Tab 4: Action Permissions**
   - ஒவ்வொரு module-க்கும் என்ன செய்யலாம் என்று set செய்யவும்:
   
   | Action  | விளக்கம் |
   |---------|----------|
   | View    | Data-ஐ பார்க்கலாம் |
   | Create  | புதியதாக add செய்யலாம் |
   | Edit    | Existing-ஐ மாற்றலாம் |
   | Delete  | Remove செய்யலாம் |
   | Approve | Requests approve செய்யலாம் |
   | Export  | Download செய்யலாம் |

   **உதாரணம்**: HR Manager-க்கு Employees module-ல்:
   - View ✅, Create ✅, Edit ✅, Delete ❌

7. **"Create Role" button click செய்து save செய்யவும்**

### Employees-க்கு Role Assign செய்வது

1. **Role card-ல் "Assign Users" button click செய்யவும்**

2. **Employee-களை search செய்து select செய்யவும்**
   - Checkbox-ஐ tick செய்து select செய்யவும்
   - Already வேறு role உள்ள employee-க்கு assign செய்தால் confirmation கேட்கும்

3. **"Save Assignments" click செய்யவும்**

4. **Employee அடுத்த முறை login செய்யும்போது புதிய permissions apply ஆகும்**

## 🎯 Example Use Cases

### Case 1: Team Lead Role

```
Role Name: Team Lead
Sidebar Menus: Dashboard, Employees, Attendance, Projects
Page Access: employees, attendance, projects

Permissions:
  Employees:
    - View ✅
    - Create ✅
    - Edit ✅
    - Delete ❌
  
  Attendance:
    - View ✅
    - Create ✅
    - Edit ✅
    - Approve ✅
  
  Projects:
    - View ✅
    - Create ✅
    - Edit ✅
```

### Case 2: Regular Employee Role

```
Role Name: Employee
Sidebar Menus: Dashboard, Attendance, Leave
Page Access: attendance, leave

Permissions:
  Attendance:
    - View ✅ (own attendance)
    - Create ✅ (check-in/out)
  
  Leave:
    - View ✅
    - Create ✅
    - Edit ✅ (own requests)
```

## ⚠️ Important Notes

1. **Admin Role**: Admin-க்கு automatic-ஆக எல்லா permissions-ம் உள்ளது

2. **Sidebar = Page Access**: 
   - Sidebar-ல் menu visible ஆனால் page access இல்லாவிட்டால் error வரும்
   - அதனால் இரண்டையும் match செய்யவும்

3. **Real-time Effect**:
   - Role permissions மாற்றினால், user logout செய்து மீண்டும் login செய்ய வேண்டும்

4. **System Roles**:
   - "Admin" போன்ற system roles-ஐ edit அல்லது delete செய்ய முடியாது

5. **Default Dashboard**:
   - எல்லா users-க்கும் Dashboard access இருக்கும்

## 🐛 Problems & Solutions

### Problem 1: Menu தெரியவில்லை
**Solution**: 
- Role-ல் sidebar permissions சரியாக set செய்யப்பட்டுள்ளதா என்று check செய்யவும்
- User logout செய்து மீண்டும் login செய்ய சொல்லவும்

### Problem 2: Menu click செய்தால் "Access Denied"
**Solution**:
- Page permissions sidebar permissions-க்கு match ஆகிறதா என்று check செய்யவும்
- Menu visible ஆனால் page access இல்லாமல் இருக்கக்கூடாது

### Problem 3: Buttons தெரியவில்லை (Create, Edit, Delete)
**Solution**:
- Action permissions சரியாக set செய்யப்பட்டுள்ளதா என்று check செய்யவும்
- உதாரணம்: "Create Employee" button காண View மட்டும் போதாது, Create permission வேண்டும்

## ✅ Testing Steps

1. ✅ புதிய role create செய்யவும் (limited permissions)
2. ✅ Test employee-க்கு assign செய்யவும்
3. ✅ அந்த employee-ஆக login செய்யவும்
4. ✅ Allowed menus மட்டும் sidebar-ல் தெரிகிறதா என்று check செய்யவும்
5. ✅ Allowed pages open ஆகிறதா என்று check செய்யவும்
6. ✅ Blocked pages access denied காட்டுகிறதா என்று check செய்யவும்
7. ✅ Buttons (Create, Edit, Delete) சரியாக show/hide ஆகிறதா என்று check செய்யவும்
8. ✅ Admin-ஆக login செய்து எல்லாமே access ஆகிறதா என்று verify செய்யவும்

## 📞 Help & Support

மேலும் விவரங்களுக்கு:
- `DYNAMIC_PERMISSIONS_GUIDE.md` file-ஐ படிக்கவும் (English)
- Code comments-ஐ check செய்யவும்

---

**Last Updated**: December 2, 2025
