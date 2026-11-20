import { createContext, useContext } from 'react';

/**
 * Dữ liệu & thao tác dùng chung giữa các trang:
 * { user, clanName, index, branches, memorials, reloadKey, can(perm),
 *   reloadTree(), reloadAll(), showOnTree(ids, opts), openForm(mode, target),
 *   deleteMember(m), openKinship(aId), openExport(opts) }
 */
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export const ROLE_LABEL = { admin: 'Tộc trưởng', secretary: 'Thư ký', member: 'Thành viên' };
