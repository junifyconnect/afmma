import { findUserById } from '../actions/find-user';

type Props = { userId: string };

export async function UserBadge({ userId }: Props) {
  const user = await findUserById(userId);
  if (!user) {
    return <span style={{ color: '#888' }}>(unknown user)</span>;
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          width: 20, height: 20, borderRadius: '50%',
          background: '#0ea5e9', color: 'white',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600,
        }}
      >
        {user.name[0]}
      </span>
      <strong>{user.name}</strong>
      <span style={{ color: '#666', fontSize: 13 }}>({user.email})</span>
    </span>
  );
}
