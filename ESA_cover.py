from terracatalogueclient import Catalogue 

# create catalogue object and authenticate 
catalogue = Catalogue().authenticate() 

# search for products in the WorldCover collection 
products = catalogue.get_products("urn:eop:VITO:ESA_WorldCover_10m_2020_V1") 

# download the products to the given directory 
catalogue.download_products(products, "downloads") 

from shapely.geometry import Polygon 
from terracatalogueclient import Catalogue 

### Authenticate to the Terrascope platform (registration required) 
# create catalogue object and authenticate interactively with a browser 
catalogue = Catalogue().authenticate()  

# or authenticate with username and password 
# catalogue = catalogue.authenticate_non_interactive(username, password) 

### Filter catalogue 
# search for all products in the WorldCover collection 
# products = catalogue.get_products("urn:eop:VITO:ESA_WorldCover_10m_2020_V1") 

# or filter to a desired geometry, by providing it as an argument to get_products 

bounds = (3, 33, 15, 45) 
geometry = Polygon.from_bounds(*bounds) 
products = catalogue.get_products("urn:eop:VITO:ESA_WorldCover_10m_2020_V1", geometry=geometry) 

### Download 
# download the products to the given directory 
catalogue.download_products(products, "downloads") 
