from collections import defaultdict
import bson

from ete3 import Tree

PYMONGO_TYPE_TO_TYPE_STRING = {
    list: "ARRAY",
    dict: "OBJECT",
    type(None): "null",

    bool: "boolean",
    int: "integer",
    bson.int64.Int64: "biginteger",
    float: "float",

    str: "string",

    bson.datetime.datetime: "date",
    bson.timestamp.Timestamp: "timestamp",

    bson.dbref.DBRef: "dbref",
    bson.objectid.ObjectId: "oid",
}

NEWICK_TYPES_STRING_TREE = """
(
    (
        (
            float, 
            ((boolean) integer) biginteger
        ) number,
        (
            oid, 
            dbref
        ) string,
        date,
        timestamp,
        unknown
    ) general_scalar,
    OBJECT
) mixed_scalar_object
;"""

TYPES_STRING_TREE = Tree(NEWICK_TYPES_STRING_TREE, format=8)


class CollectionSchema():

    def init_empty_object_schema(self):
        """ Generate an empty object schema.
        We use a defaultdict of empty fields schema. This avoid to test for the presence of fields.
        :return: defaultdict(empty_field_schema)
        """

        def empty_field_schema():
            field_dict = {
                'types_count': defaultdict(int),
                'count': 0,
            }
            return field_dict

        empty_object = defaultdict(empty_field_schema)
        return empty_object


    def filter_data(self, data):
        """ Recursively copy schema without count fields.
        :param data: schema or subpart of schema
        :return dict (subpart of schema without count fields) or original value
        """
        if isinstance(data, dict):
            schema_filtered = dict()
            for k, v in data.items():
                if k not in ['count', 'types_count', 'prop_in_object', 'array_types_count']:
                    schema_filtered[k] = self.filter_data(v)
            return schema_filtered
        return data


    def extract_collection_schema(self, pymongo_collection, with_count=True):
        """ Iterate through all document of a collection to create its schema
        - Init collection schema
        - Add every document from MongoDB collection to the schema
        - Post-process schema
        :param pymongo_collection: pymongo.collection.Collection
        :return collection_schema: dict
        """
        collection_schema = {
            'count': 0,
            "object": self.init_empty_object_schema()
        }
        print (pymongo_collection)
        n = pymongo_collection.count()
        print (n)
        i = 0
        for document in pymongo_collection.find({}):
            print (document)
            collection_schema['count'] += 1
            self.add_document_to_object_schema(document, collection_schema['object'])
            i += 1
            if i % 10 ** 5 == 0 or i == n:
                print('   scanned %s documents out of %s (%.2f %%)', i, n, (100. * i) / n)

        self.post_process_schema(collection_schema)
        collection_schema = self.recursive_default_to_regular_dict(collection_schema)
        if not with_count:
            collection_schema = self.filter_data(collection_schema)
        return collection_schema


    def recursive_default_to_regular_dict(self, value):
        """ If value is a dictionary, recursively replace defaultdict to regular dict
        Note : defaultdict are instances of dict
        :param value:
        :return d: dict or original value
        """
        if isinstance(value, dict):
            d = {k: self.recursive_default_to_regular_dict(v) for k, v in value.items()}
            return d
        else:
            return value


    def post_process_schema(self, object_count_schema):
        """ Clean and add information to schema once it has been built
        - compute the main type for each field
        - compute the proportion of non null values in the parent object
        - recursively postprocess nested object schemas
        :param object_count_schema: dict
        This schema can either be a field_schema or a collection_schema
        """
        object_count = object_count_schema['count']
        object_schema = object_count_schema['object']
        for field_schema in object_schema.values():

            self.summarize_types(field_schema)
            field_schema['prop_in_object'] = round((field_schema['count']) / float(object_count), 4)
            if 'object' in field_schema:
                self.post_process_schema(field_schema)

    def add_document_to_object_schema(self, document, object_schema):
        """ Add a all fields of a document to a local object_schema.
        :param document: dict
        contains a MongoDB Object
        :param object_schema: dict
        """
        for field, value in document.items():
            self.add_value_to_field_schema(value, object_schema[field])

    def summarize_types(self, field_schema):
        """ Summarize types information to one 'type' field
        Add a 'type' field, compatible with all encountered types in 'types_count'.
        This is done by taking the least common parent type between types.
        If 'ARRAY' type count is not null, the main type is 'ARRAY'.
        An 'array_type' is defined, as the least common parent type between 'types' and 'array_types'
        :param field_schema:
        """

        type_list = list(field_schema['types_count'])
        # Only if 'ARRAY' in 'types_count':
        type_list += list(field_schema.get('array_types_count', {}))

        cleaned_type_list = [type_name for type_name in type_list
                            if type_name != 'ARRAY' and type_name != 'null']
        common_type = self.common_parent_type(cleaned_type_list)

        if 'ARRAY' in field_schema['types_count']:
            field_schema['type'] = 'ARRAY'
            field_schema['array_type'] = common_type
        else:
            field_schema['type'] = common_type

    def add_value_to_field_schema(self, value, field_schema):
        """ Add a value to a field_schema
        - Update count or 'null_count' count.
        - Define or check the type of value.
        - Recursively add 'list' and 'dict' value to the schema.
        :param value:
        value corresponding to a field in a MongoDB Object
        :param field_schema: dict
        subdictionary of the global schema dict corresponding to a field
        """
        field_schema['count'] += 1
        self.add_value_type(value, field_schema)
        self.add_potential_list_to_field_schema(value, field_schema)
        self.add_potential_document_to_field_schema(value, field_schema)


    def add_potential_document_to_field_schema(self, document, field_schema):
        """ Add a document to a field_schema
        - Exit if document is not a dict
        :param document: dict (or skipped)
        :param field_schema:
        """
        if isinstance(document, dict):
            if 'object' not in field_schema:
                field_schema['object'] = self.init_empty_object_schema()
            self.add_document_to_object_schema(document, field_schema['object'])


    def add_potential_list_to_field_schema(self, value_list, field_schema):
        """ Add a list of values to a field_schema
        - Exit if value_list is not a list
        - Define or check the type of each value of the list.
        - Recursively add 'dict' values to the schema.
        :param value_list: list (or skipped)
        :param field_schema: dict
        """
        if isinstance(value_list, list):
            if 'array_types_count' not in field_schema:
                field_schema['array_types_count'] = defaultdict(int)

            if not value_list:
                self.add_value_type(None, field_schema, type_str='array_types_count')

            for value in value_list:
                self.add_value_type(value, field_schema, type_str='array_types_count')
                self.add_potential_document_to_field_schema(value, field_schema)


    def add_value_type(self, value, field_schema, type_str='types_count'):
        """ Define the type_str in field_schema, or check it is equal to the one previously defined.
        :param value:
        :param field_schema: dict
        :param type_str: str, either 'types_count' or 'array_types_count'
        """
        value_type_str = self.get_type_string(value)
        field_schema[type_str][value_type_str] += 1

    def get_type_string(self, value):
        """ Return mongo type string from a value
        :param value:
        :return type_string: str
        """
        value_type = type(value)
        try:
            type_string = PYMONGO_TYPE_TO_TYPE_STRING[value_type]
        except KeyError:
            print("Pymongo type %s is not mapped to a type_string. "
                        "We define it as 'unknown' for current schema extraction", value_type)
            PYMONGO_TYPE_TO_TYPE_STRING[value_type] = 'unknown'
            type_string = 'unknown'

        return type_string


    def common_parent_type(self, list_of_type_string):
        """ Get the common parent type from a list of types.
        :param list_of_type_string: list
        :return common_type: type_str
        """
        if not list_of_type_string:
            return 'null'
        # avoid duplicates as get_common_ancestor('integer', 'integer') -> 'number'
        list_of_type_string = list(set(list_of_type_string))
        if len(list_of_type_string) == 1:
            return list_of_type_string[0]
        return TYPES_STRING_TREE.get_common_ancestor(*list_of_type_string).name
