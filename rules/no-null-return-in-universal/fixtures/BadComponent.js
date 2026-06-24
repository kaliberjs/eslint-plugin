export default function BadComponent({ show }) {
  if (!show) return null
  return <div>Content</div>
}
