import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import '../styles/ShopList.css'

export function ShopList() {
  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: api.getShops,
  })

  return (
    <div className="shop-list-page">
      <header className="shop-list-header">
        <h1>Available Shops</h1>
        <a href="/admin" className="link">Admin →</a>
      </header>

      <div className="shop-grid">
        {shops.map(shop => (
          <a key={shop.id} href={`/shop/${shop.id}`} className="shop-card">
            <h2>{shop.name}</h2>
            <p>{shop.collectionIds.length > 0 ? `${shop.collectionIds.length} collections` : 'All products'}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
