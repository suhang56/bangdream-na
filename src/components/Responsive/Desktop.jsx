import { useIsMobile } from '../../lib/useBreakpoint.js'

export default function Desktop({ children }) {
  return useIsMobile() ? null : <>{children}</>
}
