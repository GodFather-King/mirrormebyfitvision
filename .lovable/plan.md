
# Menu Button Implementation Plan

## Problem Identified
The menu button (hamburger icon) in the top-left corner of the header is currently non-functional. It's just a visual button with no `onClick` handler or associated menu/drawer behavior.

## Solution
Add a slide-out drawer/sidebar menu that opens when the menu button is pressed. This will provide quick access to navigation and app features.

## Implementation Steps

### 1. Create a Sidebar Menu Component
Create a new `SidebarMenu.tsx` component using the existing Drawer UI component that includes:
- Navigation links (Home, Wardrobe, Saved Avatars)
- User authentication status
- Quick actions (Upload Photo, Add Clothing)
- App settings link

### 2. Update Header Component
Modify `src/components/Header.tsx` to:
- Import and use the Sheet/Drawer component
- Add state to control menu open/close
- Connect the menu button's `onClick` to open the drawer
- Render the SidebarMenu inside the drawer

### 3. Menu Content
The sidebar menu will include:
- **Navigation Section**: Home, Scan, Wardrobe, Saved Avatars
- **Quick Actions**: Upload Photo, Add to Wardrobe
- **Account Section**: Profile settings, Sign Out (or Sign In if not logged in)

## Technical Details

```text
+------------------+
|  FITSCAN Menu    |
+------------------+
| Navigation       |
| ├─ Home          |
| ├─ Scan          |
| ├─ Wardrobe      |
| └─ Saved Avatars |
+------------------+
| Quick Actions    |
| ├─ Upload Photo  |
| └─ Add Clothing  |
+------------------+
| Account          |
| └─ Sign Out      |
+------------------+
```

**Components Used:**
- `Sheet` from `src/components/ui/sheet.tsx` for the sliding drawer
- React Router's `useNavigate` for navigation
- Existing `useAuth` hook for authentication state

**Files to Modify:**
- `src/components/Header.tsx` - Add drawer functionality
- Create `src/components/SidebarMenu.tsx` - New menu content component

This implementation uses existing UI components already in the project, ensuring consistency with the app's design.
