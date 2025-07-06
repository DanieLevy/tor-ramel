# Project Rules & Development Guidelines

## 📋 Core Development Constraints

### File System Restrictions
- **NEVER** create `.md` files for summaries or documentation
- **NEVER** update existing `.md`, `.txt`, or similar files for action summaries
- Keep all documentation inline or in code comments when necessary

### UI/UX Framework
- **shadcn/ui** components are pre-installed and must be used
- **Mobile-first design** - all interfaces must be optimized for mobile devices
- **Hebrew language support** with full RTL (Right-to-Left) layout implementation
- **Israel timezone** for all date/time operations

### Build & Development Environment
- **Turbopack** is enabled for development builds
- **PWA application** with full service worker support
- Service worker version (`sw.js`) must be updated for each deployment

## 🗄️ Database Management

### Supabase Integration
- **Supabase DB MCP** is enabled for direct database operations
- Perform database changes independently when required
- Maintain proper error handling for all DB operations

## 🚀 Deployment & Function Limitations

### Netlify Constraints
- **Single function only**: `auto-check.js`
- **10-second execution limit** per function run
- **125K monthly executions** limit (approximately 5-minute cycles)
- Plan function scheduling accordingly to stay within limits

### Build Process
- **Build only on explicit request**
- Fix issues from root cause during build process
- Ensure all fixes are valid and comprehensive
- Update service worker version for proper PWA updates

## 🎯 Application Purpose

### Business Context
- **Barbershop/מספרה appointment system**
- Help users find available appointment opportunities
- Hebrew-language interface for Israeli market

## 📧 Testing Configuration

### Email Testing
- **Test email address**: `daniellofficial@gmail.com`
- Use for all email functionality testing

## 🔄 Development Workflow

### Complex Implementations
- Create comprehensive **to-do lists** for complex features
- Break down implementations into manageable steps
- Document dependencies and prerequisites

### Version Control & Deployment
- **NO commits** without explicit approval
- **NO builds** without explicit request
- Always confirm before making changes to production code

## 🛠️ Technical Requirements

### Language & Localization
- **Primary language**: Hebrew (עברית)
- **Text direction**: RTL throughout the application
- **Date/time formatting**: Israeli standards
- **Currency**: Israeli Shekel (₪) if applicable

### Performance Considerations
- Optimize for mobile performance
- Minimize bundle size due to mobile constraints
- Implement proper caching strategies
- Consider offline functionality for PWA

### Error Handling
- Implement comprehensive error boundaries
- Provide Hebrew error messages
- Log errors appropriately for debugging
- Graceful degradation for network issues

## 🔒 Security Guidelines

### Data Protection
- Follow GDPR/privacy regulations
- Secure API endpoints
- Validate all user inputs
- Implement proper authentication if required

### Function Security
- Validate all incoming requests to `auto-check.js`
- Implement rate limiting where possible
- Sanitize all data before processing

## 📱 PWA Requirements

### Service Worker
- Cache essential resources
- Implement offline functionality
- Handle background sync if needed
- Update cache version with each deployment

### Manifest
- Configure for proper mobile installation
- Include appropriate icons and metadata
- Set Hebrew as primary language
- Configure RTL display mode

## 📞 Communication Protocol

### Development Updates
- Provide status updates for complex implementations
- Ask for approval before major changes
- Confirm understanding of requirements
- Request clarification when needed

### Issue Resolution
- Identify root causes before implementing fixes
- Provide multiple solution options when applicable
- Document changes made
- Test thoroughly before requesting deployment

---

*Last updated: [Current Date]*
*Project: Barbershop Appointment System*
*Target: Mobile PWA for Israeli Market*