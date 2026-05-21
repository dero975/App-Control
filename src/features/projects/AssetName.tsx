export function AssetName({ name }: { name: string }) {
  const match = name.match(/^(.*?)(\s*\(.+\))$/)
  if (!match) return <strong>{name}</strong>

  return (
    <strong>
      {match[1]}
      <span className="asset-name-note">{match[2]}</span>
    </strong>
  )
}
