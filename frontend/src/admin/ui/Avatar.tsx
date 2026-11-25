export default function Avatar({ photo, name, size = 36, className = '' }: { photo: string; name: string; size?: number; className?: string }) {
  const initial = (name.trim().charAt(0) || 'A').toUpperCase()
  return photo ? (
    <img src={photo} alt="" style={{ width: size, height: size }} className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <span style={{ width: size, height: size, fontSize: size * 0.4 }} className={`flex shrink-0 items-center justify-center rounded-full bg-brand font-extrabold text-white ${className}`}>{initial}</span>
  )
}
