import { useIsMobile } from '../../lib/useBreakpoint.js'

export default function Mobile({ children }) {
  return useIsMobile() ? <>{children}</> : null
}
